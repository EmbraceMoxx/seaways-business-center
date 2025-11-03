
import * as md5 from 'md5';

export class PasswordUtil {
  static hashPassword(password: string): string {
    return md5(password).toUpperCase();
  }
}