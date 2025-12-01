/**
 * 生成安全的文件名，格式：prefix_YYYYMMDD.xlsx
 * @param prefix 文件名前缀
 * @param suffix 自定义后缀（可选）
 * @param now 当前时间（可选，用于测试）
 */
export function generateSafeFileName(
  prefix = 'file',
  suffix = 'xlsx',
  now: Date = new Date(),
): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = `${year}${month}${day}`;
  return `${prefix}_${timestamp}.${suffix}`;
}
