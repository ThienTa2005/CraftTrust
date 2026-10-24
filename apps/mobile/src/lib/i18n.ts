export type Locale = "vi" | "en";

export interface MobileTranslations {
  tabs: {
    discover: string;
    catalog: string;
    passport: string;
    cart: string;
    orders: string;
    account: string;
  };
  discover: {
    title: string;
    intro: string;
    artisans: string;
    yearsPracticing: string;
    noVillages: string;
    noVillagesMsg: string;
    noArtisans: string;
    noArtisansMsg: string;
    loadingVillages: string;
    couldNotLoad: string;
    tryAgain: string;
  };
  catalog: {
    title: string;
    intro: string;
    noProducts: string;
    noProductsMsg: string;
    loading: string;
    couldNotLoad: string;
    tryAgain: string;
  };
  passport: {
    title: string;
    intro: string;
    scanQr: string;
    enterCode: string;
    search: string;
    searching: string;
    tier: string;
    status: string;
    evidenceCount: string;
    invalidCode: string;
    notFound: string;
  };
  cart: {
    title: string;
    empty: string;
    emptyMsg: string;
    total: string;
    checkoutNote: string;
    checkoutAction: string;
    clear: string;
  };
  orders: {
    title: string;
    empty: string;
    emptyMsg: string;
    orderId: string;
    date: string;
    status: string;
    total: string;
  };
  account: {
    title: string;
    intro: string;
    signIn: string;
    signOut: string;
    email: string;
    password: string;
    language: string;
    switchLang: string;
  };
}

export const mobileTranslations: Record<Locale, MobileTranslations> = {
  vi: {
    tabs: {
      discover: "Khám phá",
      catalog: "Sản phẩm",
      passport: "Hộ chiếu",
      cart: "Giỏ hàng",
      orders: "Đơn hàng",
      account: "Tài khoản"
    },
    discover: {
      title: "Khám phá làng nghề Hà Nội",
      intro: "Khám phá câu chuyện làng nghề và hồ sơ nghệ nhân từ sổ đăng ký di sản Craft-Trust.",
      artisans: "Nghệ nhân tiêu biểu",
      yearsPracticing: "năm kinh nghiệm",
      noVillages: "Chưa có làng nghề",
      noVillagesMsg: "Chưa có dữ liệu làng nghề đã công bố từ hệ thống này.",
      noArtisans: "Chưa có nghệ nhân",
      noArtisansMsg: "Chưa có hồ sơ nghệ nhân nào được công bố từ hệ thống.",
      loadingVillages: "Đang tải danh sách làng nghề…",
      couldNotLoad: "Không tải được dữ liệu làng nghề",
      tryAgain: "Thử lại"
    },
    catalog: {
      title: "Tác phẩm thủ công Hà Nội",
      intro: "Duyệt các tác phẩm thủ công truyền thống đính kèm hồ sơ bằng chứng hộ chiếu số.",
      noProducts: "Chưa có sản phẩm",
      noProductsMsg: "Chưa có sản phẩm nào đang hoạt động trong hệ thống.",
      loading: "Đang tải danh mục sản phẩm…",
      couldNotLoad: "Không tải được sản phẩm",
      tryAgain: "Thử lại"
    },
    passport: {
      title: "Hộ chiếu số di sản",
      intro: "Quét mã QR hoặc nhập mã định danh để tra cứu hồ sơ bằng chứng thẩm định.",
      scanQr: "Quét mã QR",
      enterCode: "Nhập mã hộ chiếu hoặc đường dẫn QR...",
      search: "Tra cứu",
      searching: "Đang tra cứu…",
      tier: "Hạng xác thực",
      status: "Trạng thái",
      evidenceCount: "Bằng chứng đã duyệt",
      invalidCode: "Mã định danh không hợp lệ.",
      notFound: "Không tìm thấy hồ sơ hộ chiếu tương ứng."
    },
    cart: {
      title: "Giỏ hàng của bạn",
      empty: "Giỏ hàng trống",
      emptyMsg: "Bạn chưa chọn tác phẩm thủ công nào vào giỏ.",
      total: "Tổng cộng",
      checkoutNote: "Thanh toán thử nghiệm trên ứng dụng được bảo mật qua Supabase RLS.",
      checkoutAction: "Tiến hành thanh toán thử",
      clear: "Xóa giỏ hàng"
    },
    orders: {
      title: "Đơn hàng của bạn",
      empty: "Chưa có đơn hàng",
      emptyMsg: "Lịch sử mua hàng thử nghiệm của bạn sẽ xuất hiện tại đây.",
      orderId: "Mã đơn hàng",
      date: "Ngày tạo",
      status: "Trạng thái",
      total: "Tổng tiền"
    },
    account: {
      title: "Tài khoản cá nhân",
      intro: "Quản lý phiên đăng nhập, đơn hàng và tùy chọn giao diện.",
      signIn: "Đăng nhập",
      signOut: "Đăng xuất",
      email: "Địa chỉ email",
      password: "Mật khẩu",
      language: "Ngôn ngữ hiển thị",
      switchLang: "Chuyển sang English"
    }
  },
  en: {
    tabs: {
      discover: "Discover",
      catalog: "Crafts",
      passport: "Passport",
      cart: "Cart",
      orders: "Orders",
      account: "Account"
    },
    discover: {
      title: "Discover Hanoi craft",
      intro: "Explore published village stories and artisan profiles from the Craft-Trust heritage registry.",
      artisans: "Master artisans",
      yearsPracticing: "years practicing",
      noVillages: "No published villages",
      noVillagesMsg: "There are no published village records available from this backend.",
      noArtisans: "No published artisans",
      noArtisansMsg: "There are no published artisan profiles available from this backend.",
      loadingVillages: "Loading published craft villages…",
      couldNotLoad: "Could not load villages",
      tryAgain: "Try again"
    },
    catalog: {
      title: "Hanoi craft catalog",
      intro: "Browse traditional handcrafted objects with verifiable digital passport evidence.",
      noProducts: "No published products",
      noProductsMsg: "There are no published craft products available from this backend.",
      loading: "Loading published crafts…",
      couldNotLoad: "Could not load crafts",
      tryAgain: "Try again"
    },
    passport: {
      title: "Digital craft passport",
      intro: "Scan a physical QR code or enter an identifier to inspect approved heritage evidence.",
      scanQr: "Scan QR code",
      enterCode: "Enter passport code or QR URL...",
      search: "Search",
      searching: "Searching…",
      tier: "Evidence tier",
      status: "Status",
      evidenceCount: "Approved evidence",
      invalidCode: "Invalid passport code.",
      notFound: "No matching passport record found."
    },
    cart: {
      title: "Your cart",
      empty: "Cart is empty",
      emptyMsg: "You have not added any craft pieces to your cart yet.",
      total: "Total",
      checkoutNote: "Test checkout in mobile app is secured via Supabase RLS.",
      checkoutAction: "Proceed to test checkout",
      clear: "Clear cart"
    },
    orders: {
      title: "Your orders",
      empty: "No orders placed",
      emptyMsg: "Your test checkout order records will be listed here.",
      orderId: "Order ID",
      date: "Date",
      status: "Status",
      total: "Total"
    },
    account: {
      title: "Account settings",
      intro: "Manage authentication, order records, and display preferences.",
      signIn: "Sign in",
      signOut: "Sign out",
      email: "Email address",
      password: "Password",
      language: "Display language",
      switchLang: "Chuyển sang Tiếng Việt"
    }
  }
};
