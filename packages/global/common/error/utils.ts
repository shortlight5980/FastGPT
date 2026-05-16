// 这是一个错误处理工具函数文件
// 主要功能是提供获取错误信息、处理错误响应的工具函数
// 导出三个内容：getErrText 函数、getErrResponse 函数和 UserError 类

// 从字符串工具模块中导入 replaceSensitiveText 函数
// 该函数的作用是替换文本中的敏感信息，用于保护隐私数据
import { replaceSensitiveText } from '../string/tools';
// 导入错误响应常量对象 ERROR_RESPONSE
// 该对象包含错误码到用户友好消息的映射
import { ERROR_RESPONSE } from './errorCode';

// 定义并导出 getErrText 函数，用于从各种错误对象中提取可读的错误信息
// 参数：
//   err: any - 错误对象，可以是字符串或各种格式的错误对象
//   def: string - 默认错误消息，当无法提取错误信息时使用，默认为空字符串
// 返回值：any - 处理后的错误信息文本
export const getErrText = (err: any, def = ''): any => {
  // 定义 msg 变量用于存储提取到的错误消息
  const msg: string =
    // 首先判断 err 是否是字符串类型
    typeof err === 'string'
      ? // 如果是字符串，直接使用该字符串；如果是空字符串，则使用默认值 def
        err || def
      : // 如果不是字符串，按优先级从各种可能的错误对象结构中提取消息
        // 使用可选链操作符 ?. 安全地访问嵌套属性，避免报错
        err?.response?.data?.message || // 尝试：响应数据中的 message 字段
        err?.response?.message || // 尝试：响应中的 message 字段
        err?.message || // 尝试：错误对象本身的 message 字段
        err?.response?.data?.msg || // 尝试：响应数据中的 msg 字段（简写）
        err?.response?.msg || // 尝试：响应中的 msg 字段
        err?.msg || // 尝试：错误对象本身的 msg 字段
        err?.error || // 尝试：错误对象的 error 字段
        err?.code || // 尝试：错误对象的 code 字段
        def; // 以上都没有，使用默认值

  // 检查提取到的 msg 是否在 ERROR_RESPONSE 映射表中
  if (ERROR_RESPONSE[msg]) {
    // 如果存在映射，返回预定义的友好错误消息
    return ERROR_RESPONSE[msg].message;
  }

  // Axios 特殊情况处理
  // 检查错误对象是否有 errors 数组属性
  if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    // 如果有 errors 数组且不为空，返回数组中第一个错误的 message
    return err.errors[0].message;
  }

  // 这是一行被注释掉的调试代码，用于在控制台打印错误信息
  // msg && console.log('error =>', msg);

  // 最后，对错误消息进行敏感信息过滤后返回
  return replaceSensitiveText(msg);
};

// 定义并导出 getErrResponse 函数，用于从错误对象中获取响应数据
// 参数：err: any - 错误对象
// 返回值：any - 提取到的响应数据或原始错误对象
export const getErrResponse = (err: any): any => {
  // 按优先级返回响应数据
  // 1. 优先返回 err.response.data（完整的响应数据）
  // 2. 如果没有，返回 err.response（响应对象）
  // 3. 如果都没有，返回原始的 err 对象
  return err?.response?.data || err?.response || err;
};

// 定义并导出 UserError 类，这是一个自定义错误类
// 继承自 JavaScript 内置的 Error 类，用于区分用户错误和系统错误
export class UserError extends Error {
  // 构造函数，接收一个消息字符串参数
  constructor(message: string) {
    // 调用父类 Error 的构造函数，传入消息
    super(message);
    // 设置错误名称为 'UserError'，用于标识这是一个用户错误
    this.name = 'UserError';
  }
}
