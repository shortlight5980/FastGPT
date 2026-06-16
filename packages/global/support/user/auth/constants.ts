export enum UserAuthTypeEnum {
  register = 'register',
  findPassword = 'findPassword',
  updatePassword = 'updatePassword',
  wxLogin = 'wxLogin',
  bindNotification = 'bindNotification',
  captcha = 'captcha',
  login = 'login',
  accountDeletion = 'accountDeletion'
}

export const userAuthTypeMap = {
  [UserAuthTypeEnum.register]: 'register',
  [UserAuthTypeEnum.findPassword]: 'findPassword',
  [UserAuthTypeEnum.updatePassword]: 'updatePassword',
  [UserAuthTypeEnum.wxLogin]: 'wxLogin',
  [UserAuthTypeEnum.bindNotification]: 'bindNotification',
  [UserAuthTypeEnum.captcha]: 'captcha',
  [UserAuthTypeEnum.login]: 'login',
  [UserAuthTypeEnum.accountDeletion]: 'accountDeletion'
};
