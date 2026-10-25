import type { CraftMapLocation, TourItinerary } from "@craft-trust/contracts";

export const CRAFT_MAP_LOCATIONS: CraftMapLocation[] = [
  // --- Craft Villages ---
  {
    id: "loc-bat-trang",
    slug: "bat-trang",
    nameVi: "Làng gốm Bát Tràng",
    nameEn: "Bat Trang Pottery Village",
    type: "craft_village",
    categoryVi: "Gốm sứ thủ công cổ truyền",
    categoryEn: "Traditional Ceramics & Pottery",
    district: "Huyện Gia Lâm",
    coordinates: { lat: 20.9786, lng: 105.9085 },
    distanceKmFromCenter: 14,
    travelTimeMins: 30,
    summaryVi: "Làng gốm hơn 500 năm tuổi ven sông Hồng, nổi tiếng với các dòng men tro, men rạn và men hỏa biến nung củi nhiệt độ 1280°C.",
    summaryEn: "A 500-year-old pottery village along the Red River, world-renowned for ash glazes, crackle stoneware, and 1280°C wood kiln firing.",
    highlightsVi: [
      "Trải nghiệm tự tay vuốt gốm trên bàn xoay thủ công",
      "Chiêm ngưỡng các lò nung củi bầu cổ truyền",
      "Khám phá các xưởng men hỏa biến độc bản của Nghệ nhân Ưu tú"
    ],
    highlightsEn: [
      "Hands-on wheel-throwing session with master potters",
      "Explore historic multi-chamber wood kilns",
      "Visit private master studios for unique flambé ceramics"
    ],
    openingHoursVi: "07:30 - 18:00 (Hàng ngày)",
    openingHoursEn: "07:30 - 18:00 (Daily)",
    contactHotline: "0912 345 678",
    imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85",
    villageSlug: "bat-trang"
  },
  {
    id: "loc-van-phuc",
    slug: "van-phuc",
    nameVi: "Làng lụa Vạn Phúc",
    nameEn: "Van Phuc Silk Village",
    type: "craft_village",
    categoryVi: "Dệt lụa tơ tằm truyền thống",
    categoryEn: "Natural Silk Weaving",
    district: "Quận Hà Đông",
    coordinates: { lat: 20.9772, lng: 105.7725 },
    distanceKmFromCenter: 12,
    travelTimeMins: 25,
    summaryVi: "Làng dệt lụa hơn 1.000 năm tuổi nức tiếng đất kinh kỳ với dòng lụa vân sa mỏng nhẹ, dệt từ sợi tơ tằm tự nhiên 100%.",
    summaryEn: "A millennium-old silk capital famous for light, breathable 'Van Silk' woven on antique wooden looms from pure mulberry silk.",
    highlightsVi: [
      "Xem nghệ nhân dệt lụa trên khung cửi cổ truyền",
      "Con đường ô sắc màu rực rỡ và đền thờ Thành hoàng Ả Lã Đê Nương",
      "Trải nghiệm nhuộm lụa bằng màu thực vật tự nhiên"
    ],
    highlightsEn: [
      "Observe weaving demonstrations on antique looms",
      "Colorful umbrella street and historic craft temple",
      "Natural plant-based silk dyeing workshops"
    ],
    openingHoursVi: "08:00 - 19:00 (Hàng ngày)",
    openingHoursEn: "08:00 - 19:00 (Daily)",
    contactHotline: "0983 221 445",
    imageUrl: "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=1000&q=85",
    villageSlug: "van-phuc"
  },
  {
    id: "loc-chang-son",
    slug: "chang-son",
    nameVi: "Làng mộc & quạt Chàng Sơn",
    nameEn: "Chang Son Wood & Fan Village",
    type: "craft_village",
    categoryVi: "Điêu khắc mộc & Quạt nghệ thuật",
    categoryEn: "Woodcarving & Ceremonial Fans",
    district: "Huyện Thạch Thất",
    coordinates: { lat: 21.0345, lng: 105.5892 },
    distanceKmFromCenter: 32,
    travelTimeMins: 45,
    summaryVi: "Cái nôi chạm khắc gỗ cổ truyền với kỹ nghệ mộng gỗ âm dương không đinh và nghề làm quạt giấy tiến vua tinh xảo.",
    summaryEn: "Historic cradle of royal architectural joinery without nails, alongside delicate bamboo ceremonial paper fans.",
    highlightsVi: [
      "Tìm hiểu kỹ thuật ghép mộng gỗ âm dương cổ truyền",
      "Tự tay dán nan tre làm quạt giấy nghệ thuật",
      "Chiêm ngưỡng các tác phẩm điêu khắc gỗ tinh xảo"
    ],
    highlightsEn: [
      "Learn intricate non-nail mortise joinery techniques",
      "Craft your own customized bamboo paper fan",
      "Admire hand-carved hardwood architectural sculptures"
    ],
    openingHoursVi: "08:00 - 17:30 (Thứ 2 - Chủ Nhật)",
    openingHoursEn: "08:00 - 17:30 (Mon - Sun)",
    contactHotline: "0977 889 001",
    imageUrl: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=1000&q=85",
    villageSlug: "chuong"
  },
  {
    id: "loc-phu-vinh",
    slug: "phu-vinh",
    nameVi: "Làng mây tre đan Phú Vinh",
    nameEn: "Phu Vinh Bamboo Weaving Village",
    type: "craft_village",
    categoryVi: "Mây tre đan xuất khẩu",
    categoryEn: "Fine Rattan & Bamboo Craft",
    district: "Huyện Chương Mỹ",
    coordinates: { lat: 20.8936, lng: 105.6983 },
    distanceKmFromCenter: 25,
    travelTimeMins: 40,
    summaryVi: "Làng nghề mây tre đan hơn 400 năm tuổi, nơi nghệ nhân có thể chẻ sợi mây mỏng như sợi chỉ và đan hoa văn chim muông sống động.",
    summaryEn: "400-year-old rattan village where artisans split bamboo into thread-fine ribbons to weave realistic wildlife portraits.",
    highlightsVi: [
      "Xem kỹ nghệ chuốt nan mây tre mỏng như tơ",
      "Trải nghiệm tự đan rổ mây hoặc khay trà mini",
      "Ghé thăm xưởng xuất khẩu sản phẩm sang thị trường Châu Âu"
    ],
    highlightsEn: [
      "Watch master bamboo splitting with razor precision",
      "Weave your own mini bamboo tea coaster",
      "Visit export ateliers supplying eco-friendly tableware worldwide"
    ],
    openingHoursVi: "08:00 - 17:30 (Hàng ngày)",
    openingHoursEn: "08:00 - 17:30 (Daily)",
    contactHotline: "0945 612 889",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "loc-quang-phu-cau",
    slug: "quang-phu-cau",
    nameVi: "Làng tăm hương Quảng Phú Cầu",
    nameEn: "Quang Phu Cau Incense Village",
    type: "craft_village",
    categoryVi: "Làm hương trầm thảo mộc",
    categoryEn: "Traditional Incense Crafting",
    district: "Huyện Ứng Hòa",
    coordinates: { lat: 20.7381, lng: 105.8087 },
    distanceKmFromCenter: 36,
    travelTimeMins: 55,
    summaryVi: "Nổi tiếng toàn cầu với những sân phơi tăm hương xòe rộng như cánh sen đỏ rực rỡ, thơm ngát mùi trầm thảo mộc thiên nhiên.",
    summaryEn: "Internationally famous for lotus-shaped red incense drying courtyards and organic herbal aromatic formulations.",
    highlightsVi: [
      "Chụp ảnh nghệ thuật bên sân phơi tăm hương đỏ rực",
      "Tìm hiểu bài thuốc phối thảo mộc 12 vị làm hương trầm",
      "Trải nghiệm tự se tăm hương thủ công truyền thống"
    ],
    highlightsEn: [
      "Photogenic red incense bouquet drying fields",
      "Discover the 12-herb ancestral incense aroma recipe",
      "Hand-roll traditional ceremonial incense sticks"
    ],
    openingHoursVi: "07:00 - 18:00 (Hàng ngày)",
    openingHoursEn: "07:00 - 18:00 (Daily)",
    contactHotline: "0968 112 334",
    imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "loc-lang-chuong",
    slug: "lang-chuong",
    nameVi: "Làng nón Chuông",
    nameEn: "Chuong Conical Hat Village",
    type: "craft_village",
    categoryVi: "Chế tác nón lá thủ công",
    categoryEn: "Handcrafted Conical Hats",
    district: "Huyện Thanh Oai",
    coordinates: { lat: 20.8497, lng: 105.7788 },
    distanceKmFromCenter: 28,
    travelTimeMins: 45,
    summaryVi: "Làng nghề làm nón lá truyền thống hơn 300 năm tuổi, nơi tạo ra những chiếc nón lá 16 vành thanh thoát và nón quai thao trang nhã.",
    summaryEn: "300-year-old conical hat village renowned for 16-rib palm leaf hats and graceful northern ceremonial hats.",
    highlightsVi: [
      "Trải nghiệm ủi lá lụi và khâu nón bằng sợi cước trong suốt",
      "Chợ phiên nón lá họp vào các ngày 4, 10, 14, 20, 24, 30 âm lịch",
      "Vẽ tranh hoa sen kỷ niệm lên vành nón lá"
    ],
    highlightsEn: [
      "Learn palm leaf ironing and delicate transparent stitching",
      "Visit the traditional dawn hat market on lunar calendar dates",
      "Paint personalized lotus art on conical hat rims"
    ],
    openingHoursVi: "06:00 - 17:00 (Hàng ngày)",
    openingHoursEn: "06:00 - 17:00 (Daily)",
    contactHotline: "0934 556 778",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=85"
  },

  // --- Cultural & Tourism Landmarks Nearby ---
  {
    id: "loc-museum-bat-trang",
    slug: "museum-bat-trang",
    nameVi: "Bảo tàng Gốm Bát Tràng (Trung tâm Tinh hoa Làng nghề)",
    nameEn: "Bat Trang Ceramic Museum (Center of Craft Quintessence)",
    type: "tourism_attraction",
    categoryVi: "Kiến trúc & Bảo tàng nghệ thuật",
    categoryEn: "Architecture & Art Museum",
    district: "Huyện Gia Lâm",
    coordinates: { lat: 20.9712, lng: 105.9185 },
    distanceKmFromCenter: 14,
    travelTimeMins: 30,
    summaryVi: "Công trình kiến trúc độc bản lấy cảm hứng từ 7 bàn xoay gốm khổng lồ, nơi trưng bày hàng nghìn hiện vật gốm sứ tinh hoa qua các thời kỳ lịch sử.",
    summaryEn: "Iconic architecture inspired by seven giant potter's wheels, showcasing thousands of rare historical ceramic masterworks.",
    highlightsVi: [
      "Chiêm ngưỡng kiến trúc uốn lượn 7 bàn xoay đất nung độc đáo",
      "Không gian triển lãm nghệ thuật gốm đương đại",
      "Khu trải nghiệm nung gốm và thưởng trà trên tầng thượng ngắm sông Bắc Hưng Hải"
    ],
    highlightsEn: [
      "Unique terracotta architecture mimicking interlocking pottery wheels",
      "Contemporary craft and historical ceramic galleries",
      "Rooftop tea lounge overlooking Bac Hung Hai canal"
    ],
    openingHoursVi: "08:00 - 18:00 (Hàng ngày)",
    openingHoursEn: "08:00 - 18:00 (Daily)",
    contactHotline: "024 3874 1234",
    imageUrl: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "loc-chua-tay-phuong",
    slug: "chua-tay-phuong",
    nameVi: "Chùa Tây Phương (Sùng Phúc Tự)",
    nameEn: "Tay Phuong Pagoda (Sung Phuc Temple)",
    type: "tourism_attraction",
    categoryVi: "Di tích Quốc gia Đặc biệt · Kiến trúc cổ",
    categoryEn: "Special National Relic · Ancient Architecture",
    district: "Huyện Thạch Thất",
    coordinates: { lat: 21.0189, lng: 105.5975 },
    distanceKmFromCenter: 34,
    travelTimeMins: 50,
    summaryVi: "Ngôi cổ tự ngự trên đỉnh núi Câu Lậu với hệ thống 18 pho tượng Phật và La Hán bằng gỗ mít thế kỷ 18—kiệt tác điêu khắc của nghệ nhân Chàng Sơn xưa.",
    summaryEn: "Perched atop Cau Lau hill, renowned for 18 18th-century jackfruit-wood Arhat statues carved by historic Chang Son wood masters.",
    highlightsVi: [
      "Chiêm bái 18 pho tượng La Hán kiệt tác điêu khắc gỗ cổ",
      "Hệ mái ngói cong hình đao hai tầng chồng diêm tinh xảo",
      "Leo 237 bậc đá ong cổ kính giữa rặng rừng cây xanh mát"
    ],
    highlightsEn: [
      "Marvel at 18 masterpiece wooden Arhat sculptures",
      "Double-tiered curved roof architecture with dragon carvings",
      "Ascend 237 historic laterite stone steps under forested canopies"
    ],
    openingHoursVi: "07:00 - 17:30 (Hàng ngày)",
    openingHoursEn: "07:00 - 17:30 (Daily)",
    contactHotline: "024 3384 2110",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "loc-chua-tram",
    slug: "chua-tram",
    nameVi: "Chùa Trầm & Quần thể Núi Trầm",
    nameEn: "Tram Pagoda & Tram Mountain Complex",
    type: "tourism_attraction",
    categoryVi: "Danh thắng tâm linh & Hang động đá vôi",
    categoryEn: "Spiritual Cave Sanctuary & Limestone Hills",
    district: "Huyện Chương Mỹ",
    coordinates: { lat: 20.9234, lng: 105.6845 },
    distanceKmFromCenter: 24,
    travelTimeMins: 38,
    summaryVi: "Quần thể chùa hang độc đáo nằm tựa lưng vào núi đá vôi hùng vĩ, được mệnh danh là 'Cao nguyên đá thu nhỏ' giữa lòng Hà Nội.",
    summaryEn: "Cave pagoda sanctuary nestled against dramatic limestone crags, dubbed Hanoi's scenic miniature plateau.",
    highlightsVi: [
      "Chiêm bái tượng Phật cổ trong hang động Long Tiên thạch nhũ",
      "Leo đỉnh Núi Trầm ngắm toàn cảnh cánh đồng ven đô",
      "Kết hợp tham quan Làng mây tre đan Phú Vinh cách đó 3km"
    ],
    highlightsEn: [
      "Explore Long Tien cave shrine with natural stalactites",
      "Hike Tram Mountain summit for panoramic countryside vistas",
      "Combine seamlessly with Phu Vinh bamboo village 3km away"
    ],
    openingHoursVi: "07:00 - 17:30 (Hàng ngày)",
    openingHoursEn: "07:00 - 17:30 (Daily)",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "loc-den-chu-dong-tu",
    slug: "den-chu-dong-tu",
    nameVi: "Đền Chử Đồng Tử - Dạ Trạch",
    nameEn: "Chu Dong Tu - Da Trach Temple",
    type: "tourism_attraction",
    categoryVi: "Di tích Lịch sử Văn hóa Sông Hồng",
    categoryEn: "Historic River Sanctuary",
    district: "Ven sông Hồng (Gần Gia Lâm)",
    coordinates: { lat: 20.9125, lng: 105.9456 },
    distanceKmFromCenter: 20,
    travelTimeMins: 35,
    summaryVi: "Ngôi đền gắn liền với thiên tình sử Chử Đồng Tử - Tiên Dung và một trong Tứ Bất Tử của tín ngưỡng dân gian Việt Nam.",
    summaryEn: "Sacred riverside temple honoring Chu Dong Tu, one of Vietnamese folklore's Four Immortals, set amidst ancient banyan groves.",
    highlightsVi: [
      "Cảnh quan cổ kính bên bến sông Hồng lộng gió",
      "Lễ hội rước nước và múa rồng truyền thống",
      "Tận hưởng không gian thanh tịnh sau khi thăm Bát Tràng"
    ],
    highlightsEn: [
      "Atmospheric ancient banyan courtyard along the Red River",
      "Traditional river water procession and dragon dance heritage",
      "Tranquil spiritual respite following Bat Trang pottery touring"
    ],
    openingHoursVi: "07:30 - 17:30 (Hàng ngày)",
    openingHoursEn: "07:30 - 17:30 (Daily)",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=85"
  }
];

export const TOUR_ITINERARIES: TourItinerary[] = [
  {
    id: "tour-song-hong",
    titleVi: "Tuyến 1: Sắc gốm Sông Hồng & Tinh hoa Đất nung",
    titleEn: "Route 1: Red River Ceramics & Terracotta Heritage",
    subtitleVi: "Hành trình 1 ngày: Trung tâm Hà Nội ➔ Làng gốm Bát Tràng ➔ Bảo tàng Gốm ➔ Đền Chử Đồng Tử",
    subtitleEn: "1-Day Itinerary: Hanoi Center ➔ Bat Trang Pottery ➔ Ceramic Museum ➔ Chu Dong Tu Temple",
    durationLabelVi: "1 Ngày (08:00 - 17:00)",
    durationLabelEn: "Full Day (08:00 - 17:00)",
    locationIds: ["loc-bat-trang", "loc-museum-bat-trang", "loc-den-chu-dong-tu"],
    recommendedTransportVi: "Xe máy, Ô tô cá nhân hoặc Xe buýt tuyến 47A",
    recommendedTransportEn: "Motorbike, Private Car, or Bus Route 47A",
    descriptionVi: "Buổi sáng: Thăm làng cổ Bát Tràng, trực tiếp vuốt gốm và xem lò nung củi. Buổi trưa: Thưởng thức ẩm thực làng gốm (canh măng mực, xôi vò chè đường). Buổi chiều: Check-in Bảo tàng Gốm 7 bàn xoay và vãng cảnh đền Chử Đồng Tử bên bờ sông Hồng.",
    descriptionEn: "Morning: Explore Bat Trang alleys, wheel-throwing workshop, and historic kilns. Lunch: Savor village delicacies (bamboo shoot squid soup). Afternoon: Visit the 7-turnwheel Ceramic Museum and tranquil Chu Dong Tu Riverside Temple."
  },
  {
    id: "tour-to-lua-chua-tram",
    titleVi: "Tuyến 2: Con đường Tơ lụa & Cao nguyên đá Xứ Đoài",
    titleEn: "Route 2: Silk Weaving Trail & Limestone Sanctuary",
    subtitleVi: "Hành trình 1 ngày: Trung tâm Hà Nội ➔ Làng lụa Vạn Phúc ➔ Quần thể Chùa Trầm ➔ Làng mây tre Phú Vinh",
    subtitleEn: "1-Day Itinerary: Hanoi Center ➔ Van Phuc Silk ➔ Tram Cave Pagoda ➔ Phu Vinh Bamboo Village",
    durationLabelVi: "1 Ngày (08:30 - 17:30)",
    durationLabelEn: "Full Day (08:30 - 17:30)",
    locationIds: ["loc-van-phuc", "loc-chua-tram", "loc-phu-vinh"],
    recommendedTransportVi: "Xe máy hoặc Ô tô cá nhân (Tuyến Tố Hữu - Quốc lộ 6)",
    recommendedTransportEn: "Car or Motorbike via To Huu - Route 6",
    descriptionVi: "Buổi sáng: Tìm hiểu nghệ thuật dệt lụa tơ tằm Vạn Phúc và con đường ô sắc màu. Buổi trưa: Leo núi Trầm và vãng cảnh chùa hang động Long Tiên. Buổi chiều: Thăm xưởng đan mây tre Phú Vinh, tự tay đan quà lưu niệm mang về.",
    descriptionEn: "Morning: Discover 1,000-year Van Phuc silk looms and colorful umbrella lanes. Lunch: Hike Tram Mountain and explore limestone cave shrines. Afternoon: Visit master bamboo weavers in Phu Vinh and craft your own keepsake."
  },
  {
    id: "tour-hon-moc-tay-phuong",
    titleVi: "Tuyến 3: Nét mộc Chàng Sơn & Kiệt tác La Hán Tây Phương",
    titleEn: "Route 3: Chang Son Woodcraft & 18 Masterpiece Arhats",
    subtitleVi: "Hành trình 1 ngày: Trung tâm Hà Nội ➔ Chùa Tây Phương ➔ Làng mộc Chàng Sơn ➔ Trải nghiệm làm quạt giấy",
    subtitleEn: "1-Day Itinerary: Hanoi Center ➔ Tay Phuong Pagoda ➔ Chang Son Wood Atelier ➔ Fan Crafting",
    durationLabelVi: "1 Ngày (08:00 - 17:00)",
    durationLabelEn: "Full Day (08:00 - 17:00)",
    locationIds: ["loc-chua-tay-phuong", "loc-chang-son"],
    recommendedTransportVi: "Ô tô hoặc Xe máy theo Đại lộ Thăng Long (32km)",
    recommendedTransportEn: "Car or Motorbike via Thang Long Boulevard (32km)",
    descriptionVi: "Buổi sáng: Leo 237 bậc đá ong chiêm bái 18 pho tượng Phật và La Hán gỗ mít thế kỷ 18 tại Chùa Tây Phương. Buổi trưa: Ăn trưa cơm quê Xứ Đoài. Buổi chiều: Thăm xưởng điêu khắc mộng gỗ Chàng Sơn và thực hành tự làm chiếc quạt giấy độc bản.",
    descriptionEn: "Morning: Ascend 237 stone steps to venerate the 18 national treasure wooden Arhats at Tay Phuong Pagoda. Lunch: Countryside Xu Doai cuisine. Afternoon: Chang Son carpentry atelier visit and personalized bamboo fan making workshop."
  }
];
