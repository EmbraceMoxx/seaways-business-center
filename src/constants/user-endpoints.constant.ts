/**
 * 用户模块 API
 */
export class UserEndpoints {
  /** 用户菜单 */
  static USER_MENU_ALL = '/auth/account/user-menu-all';

  /** 当前用户角色列表 */
  static CURRENT_USER_ROLES = '/auth/user/current-roles';

  /** 用户角色列表 */
  static USER_ROLES = (userId: string) => `/auth/user/${userId}/roles`;

  /** 用户下级列表 */
  static USER_SUB_LEVEL = (userId: string) => `/auth/user/${userId}/hierarchy`;

  /** 根据id获取用户列表 */
  static USER_by_id = (userId: string) =>
    `/auth/user/get-users-by-id/${userId}`;
}
