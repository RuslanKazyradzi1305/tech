export type ProcurementPlanItem = {
  rowNum: number | string;
  type: string;
  itemKind: string;
  code: string;
  nameKz: string;
  nameRu: string;
  descKz: string;
  descRu: string;
  extraDescKz: string;
  extraDescRu: string;
  budgetRuName: string;
  procurementMethod: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalSumApproB: number;
  sum2026: number;
  month: string;
  deliveryPeriodKz: string;
  deliveryPeriodRu: string;
  kato: string;
  deliveryPlaceKz: string;
  deliveryPlaceRu: string;
  advancePercent: number;
  initiator: string;
}

export const mockPlan: ProcurementPlanItem[] = [
  {
    rowNum: 1,
    type: "01 Закупки, не превышающие финансовый год",
    itemKind: "Товар",
    code: "351110.100.000000",
    nameKz: "Электр энергиясы",
    nameRu: "Электроэнергия",
    descKz: "өзі тұтыну үшін",
    descRu: "для собственного потребления",
    extraDescKz: "Шар-Новоустькаменогорск учаскесінің сигнал беру, байланыс, есептеу техникасы құрылғыларын және темір жолдың әкімшілік тұрмыстық кешенінің объектілерін электрмен жабдықтау",
    extraDescRu: "Электроснабжения устройств сигнализации, связи, вычислительной техники и объектов административно-бытового комплекса железной дороги участка Шар Новоустькаменогорск",
    budgetRuName: "Электроэнергия",
    procurementMethod: "ИОИ",
    unit: "Киловатт-час",
    quantity: 2702000,
    unitPrice: 38.88,
    totalSumApproB: 105053760.00,
    sum2026: 105053760.00,
    month: "Декабрь 2025 год - Январь 2026 год",
    deliveryPeriodKz: "ай сайын",
    deliveryPeriodRu: "ежемесячно",
    kato: "631000000",
    deliveryPlaceKz: "Өскемен, Республикалық к., 9/1",
    deliveryPlaceRu: "г. Усть-Каменогорск, ул. Республиканская 9/1",
    advancePercent: 0,
    initiator: "Ведущий инженер по энергоснабжению ВКФ"
  },
  {
    rowNum: 2,
    type: "01 Закупки, не превышающие финансовый год",
    itemKind: "Товар",
    code: "141211.290.000029",
    nameKz: "Костюм",
    nameRu: "Костюм",
    descKz: "ерлердің, қызмет көрсету саласы үшін, матадан",
    descRu: "мужской, для сферы обслуживания, из ткани",
    extraDescKz: "Техникалық ерекшелікке сәйкес",
    extraDescRu: "Согласно технической спецификации",
    budgetRuName: "Костюм",
    procurementMethod: "ИОИ",
    unit: "Комплект",
    quantity: 31,
    unitPrice: 97883.33,
    totalSumApproB: 3034383.23,
    sum2026: 3034383.23,
    month: "январь - март",
    deliveryPeriodKz: "Шартқа қол қойылған сәттен бастап 60 күнтізбелік күн",
    deliveryPeriodRu: "60 календарных дней с момента подписания договора",
    kato: "631000000",
    deliveryPlaceKz: "Өскемен қ., Республикалық к., 9/1",
    deliveryPlaceRu: "г. Усть-Каменогорск, ул. Республиканская 9/1",
    advancePercent: 0,
    initiator: "Ведущий инженер по ОТ и ТБ ВКФ"
  }
];

export const t = {
  ru: {
    dashboard: "Дашборд",
    plan: "План закупа",
    spec: "Тех. Спецификация",
    searchPlaceholder: "Поиск по коду или наименованию...",
    enterRowNum: "Выберите пункт из плана:",
    generate: "Сформировать",
    createSpecBtn: "Создать ТЗ",
    notFound: "Пункт не найден.",
    totalBudget: "Общий бюджет (Тенге)",
    totalItems: "Всего позиций",
    executionStatus: "Статус исполнения (%)",
    byMethod: "По способам закупок",
    adminPanel: "Панель администратора (ввод данных)",
    save: "Сохранить",
    specTitle: "Техническая спецификация по планируемым закупкам ТРУ",
    customer: "Наименование заказчика",
    itemKind: "Вид предмета закупок",
    code: "Код товара, работы, услуги (в соответствии с ЕНС ТРУ)",
    itemName: "Наименование закупаемых товаров, работ, услуг (в соответствии с ЕНС ТРУ)",
    itemDesc: "Краткая характеристика (описание) товаров, работ и услуг (в соответствии с ЕНС ТРУ)",
    extraDesc: "Дополнительная характеристика",
    planTerm: "Планируемый срок осуществления закупок",
    deliveryPlace: "Место поставки",
    deliveryPeriod: "Срок поставки",
    unit: "Единица измерения",
    quantity: "Количество (объем)",
    paymentTerms: "Условия платежа",
    warranty: "Гарантийный срок (в месяцах)",
    reqDesc: "Описание требуемых характеристик, параметров ин. исходных данных",
    developedBy: "Разработано:",
    position: "Должность",
    fio: "ФИО",
    lang: "Язык",
    uploadPlan: "Загрузить План (Excel)",
    exportPdf: "Скачать PDF",
    exportWord: "Скачать Word",
    approverFields: "Утверждающий",
    developerFields: "Разработчик",
    extraFields: "Доп. параметры",
    approvedBy: "УТВЕРЖДАЮ:",
    paymentTermsPlaceholder: "Условия платежа (необязательно)",
    warrantyPlaceholder: "Гарантия (необязательно)",
    reqDescPlaceholder: "Требуемые характеристики...",
    admin: "Админ-панель",
    savings: "Экономия",
    q1: "1 кв.",
    q2: "2 кв.",
    q3: "3 кв.",
    q4: "4 кв.",
    statsUpdated: "Данные обновлены",
    history: "История",
    structure: "Структура",
  },
  kz: {
    dashboard: "Бақылау тақтасы",
    plan: "Сатып алу жоспары",
    spec: "Тех. Ерекшелік",
    searchPlaceholder: "Код немесе атау бойынша іздеу...",
    enterRowNum: "Жоспардан тармақты таңдаңыз:",
    generate: "Құру",
    createSpecBtn: "ТЕ құру",
    notFound: "Тармақ табылмады.",
    totalBudget: "Жалпы бюджет (Теңге)",
    totalItems: "Барлық позициялар",
    executionStatus: "Орындалу мәртебесі (%)",
    byMethod: "Сатып алу тәсілдері бойынша",
    adminPanel: "Әкімші тақтасы (деректерді енгізу)",
    save: "Сақтау",
    specTitle: "Жоспарланған ТҚЖ сатып алу бойынша техникалық ерекшелік",
    customer: "Тапсырыс берушінің атауы",
    itemKind: "Сатып алу затының түрі",
    code: "Тауар, жұмыс, көрсетілетін қызмет коды (БҰЖ АЖ-ға сәйкес)",
    itemName: "Сатып алынатын тауарлардың, жұмыстардың, қызметтердің атауы",
    itemDesc: "Тауарлардың, жұмыстардың және қызметтердің қысқаша сипаттамасы",
    extraDesc: "Қосымша сипаттама",
    planTerm: "Сатып алуды жүзеге асырудың жоспарланған мерзімі",
    deliveryPlace: "Жеткізу орны",
    deliveryPeriod: "Жеткізу мерзімі",
    unit: "Өлшем бірлігі",
    quantity: "Саны (көлемі)",
    paymentTerms: "Төлем шарттары",
    warranty: "Кепілдік мерзімі (аймен)",
    reqDesc: "Қажетті сипаттамалардың, параметрлердің және басқа бастапқы деректердің сипаттамасы",
    developedBy: "Әзірлеген:",
    position: "Лауазымы",
    fio: "Аты-жөні",
    lang: "Тіл",
    uploadPlan: "Жоспарды жүктеу (Excel)",
    exportPdf: "PDF жүктеп алу",
    exportWord: "Word жүктеп алу",
    approverFields: "Бекітуші",
    developerFields: "Әзірлеуші",
    extraFields: "Қосымша параметрлер",
    approvedBy: "БЕКІТЕМІН:",
    paymentTermsPlaceholder: "Төлем шарттары (міндетті емес)",
    warrantyPlaceholder: "Кепілдік (міндетті емес)",
    reqDescPlaceholder: "Қажетті сипаттамалар...",
    admin: "Админ тақтасы",
    savings: "Үнемдеу",
    q1: "1-тоқсан",
    q2: "2-тоқсан",
    q3: "3-тоқсан",
    q4: "4-тоқсан",
    statsUpdated: "Деректер жаңартылды",
    history: "Тарих",
    structure: "Құрылым",
  }
}

