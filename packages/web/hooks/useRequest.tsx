// 这是一个封装 ahooks useRequest 的自定义 hook
// 主要功能是在 ahooks useRequest 的基础上，增加了统一的成功和错误提示功能
// 使用 next-i18next 进行国际化，useToast 显示提示信息
// 导出 useRequest 自定义 hook

// 导入自定义的 useToast hook，用于显示提示信息
import { useToast } from './useToast';
// 导入 @tanstack/react-query 的 useMutation（注：当前代码未使用）
import { useMutation } from '@tanstack/react-query';
// 导入 @tanstack/react-query 的 UseMutationOptions 类型（注：当前代码未使用）
import type { UseMutationOptions } from '@tanstack/react-query';
// 导入获取错误文本的工具函数
import { getErrText } from '@fastgpt/global/common/error/utils';
// 导入国际化 hook，用于多语言支持
import { useTranslation } from 'next-i18next';
// 从 ahooks 导入 useRequest，并重命名为 ahooksUseRequest
// 这是我们要封装的基础 hook
import { useRequest as ahooksUseRequest } from 'ahooks';

// 定义 Props 接口，继承自 UseMutationOptions（注：当前代码未使用此接口）
// 增加了成功和错误提示的配置
interface Props extends UseMutationOptions<any, any, any, any> {
  successToast?: string | null; // 成功提示的内容，可选
  errorToast?: string | null; // 错误提示的内容，可选
}

// 定义 UseRequestFunProps 类型，获取 ahooksUseRequest 的参数类型
// TData: 返回数据的类型
// TParams: 参数的类型，是一个数组类型
type UseRequestFunProps<TData, TParams extends any[]> = Parameters<
  typeof ahooksUseRequest<TData, TParams>
>;

// 定义并导出 useRequest 自定义 hook
// 这是对 ahooks useRequest 的二次封装，增加了统一的提示功能
// TData: 返回数据的类型
// TParams: 参数的类型，是一个数组类型
export const useRequest = <TData, TParams extends any[]>(
  // 第一个参数：服务请求函数，与 ahooks useRequest 的第一个参数一致
  server: UseRequestFunProps<TData, TParams>[0],
  // 第二个参数：配置选项，在 ahooks useRequest 配置的基础上增加了 errorToast 和 successToast
  options: UseRequestFunProps<TData, TParams>[1] & {
    errorToast?: string; // 错误提示的内容，可选
    successToast?: string; // 成功提示的内容，可选
  } = {}, // 默认值为空对象
  // 第三个参数：插件，与 ahooks useRequest 的第三个参数一致，可选
  plugin?: UseRequestFunProps<TData, TParams>[2]
) => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  // 从 options 中解构出 errorToast 和 successToast，其余属性放在 rest 中
  // errorToast 默认为 'Error'
  const { errorToast = 'Error', successToast, ...rest } = options || {};
  // 获取 toast 函数，用于显示提示信息
  const { toast } = useToast();

  // 调用 ahooks 的 useRequest
  const res = ahooksUseRequest<TData, TParams>(
    server, // 传入服务请求函数
    {
      manual: true, // 设置为手动触发模式
      ...rest, // 透传其余配置选项
      // 自定义 onError 回调
      onError: (err, params) => {
        // 先调用用户自己定义的 onError（如果有）
        rest?.onError?.(err, params);
        // 如果 errorToast 不为空字符串，则显示错误提示
        if (errorToast !== '') {
          // 获取错误文本并进行国际化翻译
          const errText = t(getErrText(err, errorToast || '') as any);
          // 如果有错误文本，则显示错误提示
          if (errText) {
            toast({
              title: errText, // 提示标题
              status: 'error' // 提示类型为错误
            });
          }
        }
      },
      // 自定义 onSuccess 回调
      onSuccess: (res, params) => {
        // 先调用用户自己定义的 onSuccess（如果有）
        rest?.onSuccess?.(res, params);
        // 如果设置了 successToast，则显示成功提示
        if (successToast) {
          toast({
            title: successToast, // 提示标题
            status: 'success' // 提示类型为成功
          });
        }
      }
    },
    plugin // 传入插件
  );

  // 返回 ahooks useRequest 的返回结果，保持原有的 API 不变
  return res;
};
