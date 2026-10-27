/**
 * CraftTrust Error Utilities
 * Ensures no "[object Object]" is ever serialized or returned to clients.
 * Formats Supabase PostgrestError, Error instances, and plain strings into safe, user-friendly Vietnamese messages.
 */

export interface ParsedError {
  code?: string | undefined;
  message: string;
  details?: string | null | undefined;
  hint?: string | null | undefined;
  rawMessage: string;
}

/**
 * Parses any unknown error (Supabase PostgrestError, Error, string, or object)
 * into a structured object with guaranteed non-"[object Object]" message.
 */
export function parseApiError(cause: unknown): ParsedError {
  if (!cause) {
    return {
      message: "Đã xảy ra lỗi không xác định.",
      rawMessage: "Unknown error",
    };
  }

  if (typeof cause === "string") {
    const trimmed = cause.trim();
    if (trimmed && trimmed !== "[object Object]") {
      return {
        message: mapToVietnameseMessage(trimmed),
        rawMessage: trimmed,
      };
    }
    return {
      message: "Đã xảy ra lỗi khi xử lý yêu cầu.",
      rawMessage: "[object Object] intercepted",
    };
  }

  if (typeof cause === "object") {
    const obj = cause as Record<string, unknown>;
    const code = typeof obj.code === "string" ? obj.code : undefined;
    const details = typeof obj.details === "string" ? obj.details : null;
    const hint = typeof obj.hint === "string" ? obj.hint : null;

    let rawMessage = "";
    if (typeof obj.message === "string" && obj.message && obj.message !== "[object Object]") {
      rawMessage = obj.message;
    } else if (typeof obj.error_description === "string" && obj.error_description) {
      rawMessage = obj.error_description;
    } else if (typeof obj.error === "string" && obj.error && obj.error !== "[object Object]") {
      rawMessage = obj.error;
    } else if (cause instanceof Error && cause.message && cause.message !== "[object Object]") {
      rawMessage = cause.message;
    } else {
      rawMessage = "Unspecified database or system exception";
    }

    const message = mapToVietnameseMessage(rawMessage, code);

    return {
      code,
      message,
      details,
      hint,
      rawMessage,
    };
  }

  const str = String(cause);
  const cleanStr = str === "[object Object]" ? "Unspecified exception" : str;
  return {
    message: mapToVietnameseMessage(cleanStr),
    rawMessage: cleanStr,
  };
}

/**
 * Translates technical error codes and strings to clear, user-facing Vietnamese messages.
 * Never exposes SQL syntax, table schemas, or secrets.
 */
export function mapToVietnameseMessage(rawMessage: string, code?: string): string {
  const lower = rawMessage.toLowerCase();

  // 1. Budget limits & compute capacity
  if (
    code === "P0001" ||
    code === "EX002" ||
    lower.includes("gpu budget exceeded") ||
    lower.includes("compute budget limit reached") ||
    lower.includes("budget exceeded")
  ) {
    return "Hạn mức ngân sách GPU hôm nay đã đạt mức tối đa ($3/ngày). Vui lòng thử lại vào ngày mai hoặc liên hệ ban quản trị.";
  }

  if (
    lower.includes("budget is disabled") ||
    lower.includes("administratively blocked") ||
    code === "EX001"
  ) {
    return "Dịch vụ tạo mô hình 3D tạm thời chưa được kích hoạt hoặc đang bảo trì.";
  }

  // 2. Active job conflict
  if (
    code === "23505" ||
    lower.includes("active pixal3d job already exists") ||
    lower.includes("job already exists")
  ) {
    return "Sản phẩm đang có một tiến trình tạo 3D trong hàng đợi hoặc đang xử lý. Vui lòng chờ hoàn tất.";
  }

  // 3. Permissions / RLS
  if (
    code === "42501" ||
    lower.includes("product ownership required") ||
    lower.includes("permission denied") ||
    lower.includes("row-level security")
  ) {
    return "Bạn không có quyền thao tác trên sản phẩm này.";
  }

  // 4. Source image validation
  if (lower.includes("requires 1-4 source images") || lower.includes("chưa có ảnh nguồn")) {
    return "Sản phẩm chưa có ảnh nguồn. Hãy bấm 'Sửa sản phẩm' để tải từ 1 đến 4 ảnh lên trước khi tạo 3D.";
  }

  if (lower.includes("canonical front image is required") || lower.includes("ít nhất một ảnh chính diện")) {
    return "Sản phẩm cần ít nhất một ảnh chính diện (FRONT) để AI có thể dựng mô hình 3D.";
  }

  if (lower.includes("multi-view requires 2-4 calibrated cardinal views") || lower.includes("đa góc")) {
    return "Chế độ tạo đa góc cần từ 2 đến 4 ảnh đã được thiết lập góc chụp chuẩn (Trước, Sau, Trái, Phải).";
  }

  if (lower.includes("maximum generation attempts reached")) {
    return "Sản phẩm đã đạt số lần thử tạo 3D tối đa (10 lần). Vui lòng liên hệ ban quản trị để được hỗ trợ.";
  }

  // 5. Database schema / migration error (prevent leaking internal SQL columns like 42703)
  if (
    code === "42703" ||
    code === "42P01" ||
    lower.includes("does not exist") ||
    lower.includes("syntax error")
  ) {
    return "Hệ thống đang đồng bộ cấu hình dịch vụ 3D. Vui lòng thử lại sau ít phút.";
  }

  // 6. Network / Dispatch / Timeout
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return "Kết nối tới dịch vụ AI tạm thời bị gián đoạn. Vui lòng thử lại.";
  }

  // Safe fallback
  if (rawMessage && !rawMessage.includes("Error:") && !rawMessage.includes("Exception") && rawMessage.length < 120) {
    return rawMessage;
  }

  return "Không thể khởi tạo tác vụ 3D. Vui lòng thử lại sau.";
}
