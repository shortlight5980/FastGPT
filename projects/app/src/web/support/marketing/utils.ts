// 这是一个营销相关的工具函数文件
// 主要功能是管理各种营销跟踪参数（如邀请人ID、UTM参数、推广渠道等）的存储和读取
// 使用 localStorage 和 sessionStorage 在浏览器端持久化数据
// 导出多个 getter、setter 和 remove 函数用于操作不同的营销参数

// 从全局类型定义中导入营销相关的类型
// ShortUrlParams: 短链接参数类型
// TrackRegisterParams: 注册跟踪参数类型
import {
  type ShortUrlParams,
  type TrackRegisterParams
} from '@fastgpt/global/support/marketing/type';

// ========== 邀请人ID相关函数 ==========

// 获取邀请人ID
// 返回值：string | undefined - 从 localStorage 中获取的邀请人ID，如果没有则返回 undefined
export const getInviterId = () => {
  // 使用 localStorage.getItem 获取存储的值，如果为空则返回 undefined
  return localStorage.getItem('inviterId') || undefined;
};
// 设置邀请人ID
// 参数：inviterId?: string - 要设置的邀请人ID，可选参数
export const setInviterId = (inviterId?: string) => {
  // 如果 inviterId 为空或未定义，直接返回，不做任何操作
  if (!inviterId) return;
  // 将邀请人ID保存到 localStorage 中
  localStorage.setItem('inviterId', inviterId);
};
// 移除邀请人ID
export const removeInviterId = () => {
  // 从 localStorage 中删除 inviterId
  localStorage.removeItem('inviterId');
};

// ========== 百度推广ID相关函数 ==========

// 获取百度推广ID (bd_vid)
// 返回值：string | undefined - 从 sessionStorage 中获取的值
export const getBdVId = () => {
  // 使用 sessionStorage 获取，sessionStorage 在关闭标签页后会清除
  return sessionStorage.getItem('bd_vid') || undefined;
};
// 设置百度推广ID
// 参数：bdVid?: string - 百度推广ID
export const setBdVId = (bdVid?: string) => {
  // 如果 bdVid 为空，直接返回
  if (!bdVid) return;
  // 保存到 sessionStorage
  sessionStorage.setItem('bd_vid', bdVid);
};

// ========== 微软广告ID相关函数 ==========

// 获取微软广告点击ID (msclkid)
export const getMsclkid = () => {
  return sessionStorage.getItem('msclkid') || undefined;
};
// 设置微软广告点击ID
export const setMsclkid = (msclkid?: string) => {
  if (!msclkid) return;
  sessionStorage.setItem('msclkid', msclkid);
};

// ========== UTM工作流相关函数 ==========

// 获取UTM工作流参数
export const getUtmWorkflow = () => {
  return localStorage.getItem('utm_workflow') || undefined;
};
// 设置UTM工作流参数
export const setUtmWorkflow = (utmWorkflow?: string) => {
  if (!utmWorkflow) return;
  localStorage.setItem('utm_workflow', utmWorkflow);
};
// 移除UTM工作流参数
export const removeUtmWorkflow = () => {
  localStorage.removeItem('utm_workflow');
};

// ========== UTM参数相关函数 ==========

// 获取UTM参数对象
// 返回值：ShortUrlParams - 解析后的短链接参数对象
export const getUtmParams = () => {
  try {
    // 从 localStorage 中获取字符串并尝试解析为 JSON 对象
    // 如果获取不到，使用 '{}' 作为默认值
    const params = JSON.parse(localStorage.getItem('utm_params') || '{}');
    // 将解析后的结果断言为 ShortUrlParams 类型并返回
    return params as ShortUrlParams;
  } catch (error) {
    // 如果解析出错（JSON格式不正确），返回空对象
    return {} as ShortUrlParams;
  }
};
// 设置UTM参数对象
// 参数：utmParams?: ShortUrlParams - 要设置的UTM参数对象
export const setUtmParams = (utmParams?: ShortUrlParams) => {
  // 如果 utmParams 为空，或者是一个空对象（没有任何属性），直接返回
  if (!utmParams || Object.keys(utmParams).length === 0) return;
  // 将对象序列化为 JSON 字符串后保存到 localStorage
  localStorage.setItem('utm_params', JSON.stringify(utmParams));
};
// 移除UTM参数
export const removeUtmParams = () => {
  localStorage.removeItem('utm_params');
};

// ========== FastGPT SEM参数相关函数 ==========

// 获取FastGPT搜索引擎营销参数
// 返回值：TrackRegisterParams['fastgpt_sem'] | undefined - SEM参数对象或undefined
export const getFastGPTSem = () => {
  try {
    // 检查 localStorage 中是否存在 fastgpt_sem
    return localStorage.getItem('fastgpt_sem')
      ? // 如果存在，解析为 JSON 对象并返回（使用 ! 断言非空）
        JSON.parse(localStorage.getItem('fastgpt_sem')!)
      : // 如果不存在，返回 undefined
        undefined;
  } catch {
    // 如果解析出错，返回 undefined
    return undefined;
  }
};
// 设置FastGPT SEM参数
// 参数：fastgptSem?: TrackRegisterParams['fastgpt_sem'] - SEM参数对象
export const setFastGPTSem = (fastgptSem?: TrackRegisterParams['fastgpt_sem']) => {
  // 如果 fastgptSem 为空，直接返回
  if (!fastgptSem) return;

  // 过滤掉对象中值为空的属性
  // Object.entries 将对象转为 [key, value] 数组
  // filter 过滤出 value 为真值的条目
  const validEntries = Object.entries(fastgptSem).filter(([_, value]) => !!value);
  // 如果没有有效的条目（所有值都为空），直接返回
  if (validEntries.length === 0) return;

  // 将有效的参数对象保存到 localStorage
  localStorage.setItem('fastgpt_sem', JSON.stringify(fastgptSem));
};
// 移除FastGPT SEM参数
export const removeFastGPTSem = () => {
  localStorage.removeItem('fastgpt_sem');
};

// ========== 来源域名相关函数 ==========

// 获取来源域名
export const getSourceDomain = () => {
  return sessionStorage.getItem('sourceDomain') || undefined;
};
// 设置来源域名
// 参数：sourceDomain?: string - 来源域名，可选
export const setSourceDomain = (sourceDomain?: string) => {
  // 使用立即执行函数表达式(IIFE)来计算格式化后的来源域名
  const formatSourceDomain = (() => {
    // 如果传入了 sourceDomain，直接使用它
    if (sourceDomain) return sourceDomain;
    // 否则使用 document.referrer 获取引荐来源（用户从哪个页面跳转过来的）
    return document.referrer;
  })();

  // 如果格式化后的来源域名为空，或者已经存在 sourceDomain，则不做任何操作
  if (!formatSourceDomain || getSourceDomain()) return;
  // 保存到 sessionStorage
  sessionStorage.setItem('sourceDomain', formatSourceDomain);
};

// ========== 优惠码相关函数 ==========

// 设置优惠码
export const setCouponCode = (couponCode?: string) => {
  if (!couponCode) return;
  localStorage.setItem('couponCode', couponCode);
};

// 获取优惠码
export const getCouponCode = () => {
  return localStorage.getItem('couponCode') || undefined;
};

// 移除优惠码
export const removeCouponCode = () => {
  localStorage.removeItem('couponCode');
};
