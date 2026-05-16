#!/usr/bin/env node
// 这是一个 MCP (Model Context Protocol) 服务器的入口文件
// MCP 是一种协议，允许 AI 模型与外部工具和数据源进行交互
// 本文件创建了一个基于 Express 的 HTTP 服务器，提供 SSE (Server-Sent Events) 连接
// 主要功能：提供工具列表、调用 FastGPT 的工具

// 导入初始化函数
import { init } from './init';
// 导入 MCP Server 类，用于创建 MCP 服务器
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// 导入工具调用结果的类型定义
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
// 导入请求的验证 schema，用于验证工具列表请求和工具调用请求的格式
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// 导入 SSE 传输类，用于服务器向客户端推送事件
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
// 导入 Express Web 框架，用于创建 HTTP 服务器
import express from 'express';

// 导入 FastGPT 相关的 API 函数：调用工具和获取工具列表
import { callTool, getTools } from './api/fastgpt';
// 导入错误处理工具函数，用于获取错误的文本信息
import { getErrText } from '@fastgpt/global/common/error/utils';
// 导入日志相关的函数和常量，用于记录服务器运行日志
import { configureLogger, getLogger, LogCategories } from './logger';

// 创建 Express 应用实例
const app = express();
// 获取日志记录器实例，分类为 MCP 服务器
const logger = getLogger(LogCategories.MODULE.MCP.SERVER);

// 定义传输映射对象，用于存储 sessionId 对应的 SSE 传输实例
// 这样可以通过 sessionId 找到对应的连接进行消息处理
const transportMap: Record<string, SSEServerTransport> = {};

// 定义 SSE 连接的 GET 路由，路径包含 key 参数
// key 参数用于标识不同的客户端或权限
app.get('/:key/sse', async (req, res) => {
  // 从 URL 参数中获取 key
  const { key } = req.params;

  // 创建 SSE 传输实例，指定消息接收的端点
  const transport = new SSEServerTransport(`/${key}/messages`, res);

  // 将传输实例存储到映射中，键为 sessionId
  transportMap[transport.sessionId] = transport;

  // 创建 MCP 服务器实例
  const server = new Server(
    {
      // 服务器名称
      name: 'fastgpt-mcp-server',
      // 服务器版本
      version: '1.0.0'
    },
    {
      // 定义服务器能力：支持工具功能
      capabilities: {
        tools: {}
      }
    }
  );

  // 监听传输关闭事件
  transport.onclose = () => {
    // 记录传输关闭的日志
    logger.info(`Transport closed ${transport.sessionId}`);
    // 从映射中删除对应的传输实例
    delete transportMap[transport.sessionId];
  };
  // 监听传输错误事件
  transport.onerror = (err) => {
    // 记录传输错误的日志
    logger.error(`Transport error ${transport.sessionId}`, { error: err });
  };
  // 监听服务器关闭事件
  server.onclose = () => {
    // 记录服务器关闭的日志
    logger.info(`Server closed ${transport.sessionId}`);
    // 从映射中删除对应的传输实例
    delete transportMap[transport.sessionId];
  };
  // 监听服务器错误事件
  server.onerror = (err) => {
    // 记录服务器错误的日志
    logger.error(`Server error ${transport.sessionId}`, { error: err });
  };

  // 设置获取工具列表的请求处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    // 调用 getTools 函数获取工具列表并返回
    tools: await getTools(key)
  }));

  // 定义处理工具调用的函数
  const handleToolCall = async (
    name: string,
    args: Record<string, any>
  ): Promise<CallToolResult> => {
    try {
      // 记录工具调用的日志，包括工具名和参数
      logger.info(`Call tool: ${name} with args: ${JSON.stringify(args)}`);
      // 调用 FastGPT 的工具，传入 key、工具名和参数
      const result = await callTool({ key, toolName: name, inputs: args });

      // 返回成功的结果，格式化为文本类型
      return {
        content: [
          {
            type: 'text',
            // 如果结果是字符串直接使用，否则转为 JSON 字符串
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ],
        isError: false
      };
    } catch (error) {
      // 如果出错，返回错误信息
      return {
        message: getErrText(error),
        content: [],
        isError: true
      };
    }
  };
  // 设置工具调用的请求处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    // 调用处理函数，传入工具名和参数（如果参数为空则使用空对象）
    handleToolCall(request.params.name, request.params.arguments ?? {})
  );

  // 连接服务器和传输
  await server.connect(transport);
  // 记录服务器连接成功的日志
  logger.info(`Server connected: ${transport.sessionId}`);
});

// 定义消息接收的 POST 路由
app.post('/:key/messages', (req, res) => {
  // 从查询参数中获取 sessionId
  const { sessionId } = req.query as { sessionId: string };

  // 从映射中查找对应的传输实例
  const transport = transportMap[sessionId];
  // 如果找到了传输实例，处理接收到的消息
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

// 定义服务器监听的端口，优先使用环境变量中的端口，默认 3000
const PORT = process.env.PORT || 3000;

// 定义启动函数
async function bootstrap() {
  // 执行初始化操作
  await init();
  // 配置日志系统，设置服务名称
  await configureLogger({ serviceName: 'fastgpt-mcp-server' });

  // 启动 Express 服务器
  app
    .listen(PORT, () => {
      // 服务器启动成功后，记录日志
      logger.info(`Server is running on port ${PORT}`);
    })
    // 监听服务器错误事件
    .on('error', (err) => {
      // 记录服务器错误日志
      logger.error('Server error', { error: err });
    });
}

// 调用启动函数，启动服务器
// 使用 void 操作符表示我们不关心这个 Promise 的返回值
void bootstrap();
