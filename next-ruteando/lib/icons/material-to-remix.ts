/**
 * Equivalencias entre los iconos de Material Symbols que usa ng-ruteando (88 declarados en plantillas y TypeScript, más los glifos de
 * estado) y los de Remix Icon (`@remixicon/react`, variante `-Line`). Es la guía para portar cada pantalla: se importa el icono por su
 * NOMBRE (`import { RiRouteLine } from '@remixicon/react'`) y se pinta con `<Icon icon={RiRouteLine} />`, de modo que cada página solo
 * empaqueta los suyos y un nombre inexistente falla al compilar (no se ve como texto, como pasaba con la fuente de Material).
 * `test/icons.test.ts` comprueba que todos los valores existen en la versión instalada.
 *
 * Elegidos por significado, no por parecido de trazo: donde Remix no tiene el mismo concepto se anota la decisión.
 */
export const MATERIAL_TO_REMIX = {
  // Marca, navegación y acciones
  account_circle: 'RiAccountCircleLine',
  add: 'RiAddLine',
  add_box: 'RiAddBoxLine',
  add_circle: 'RiAddCircleLine',
  add_road: 'RiRoadMapLine', // «Planificar jornada»: Remix no tiene carretera con «+»
  arrow_back: 'RiArrowLeftLine',
  arrow_forward: 'RiArrowRightLine',
  check: 'RiCheckLine',
  chevron_right: 'RiArrowRightSLine',
  close: 'RiCloseLine',
  expand_less: 'RiArrowUpSLine',
  expand_more: 'RiArrowDownSLine',
  home: 'RiHome4Line',
  logout: 'RiLogoutBoxRLine',
  menu: 'RiMenuLine',
  more_horiz: 'RiMore2Line',
  open_in_new: 'RiExternalLinkLine',
  refresh: 'RiRefreshLine',
  search: 'RiSearchLine',
  search_off: 'RiFileSearchLine', // Remix no tiene lupa tachada
  tune: 'RiEqualizerLine',
  swap_horiz: 'RiArrowLeftRightLine',
  // Datos y listados
  category: 'RiShapesLine',
  density_medium: 'RiMenu2Line',
  density_small: 'RiMenu5Line',
  download: 'RiDownloadLine',
  drag_handle: 'RiDraggable',
  filter_alt: 'RiFilter3Line',
  filter_alt_off: 'RiFilterOffLine',
  grid_view: 'RiLayoutGridLine',
  inbox: 'RiInboxLine',
  list: 'RiListUnordered',
  manage_search: 'RiSearchEyeLine',
  table_rows: 'RiTableLine',
  upload_file: 'RiFileUploadLine',
  picture_as_pdf: 'RiFilePdf2Line',
  content_copy: 'RiFileCopyLine',
  code: 'RiCodeLine',
  // Edición
  delete: 'RiDeleteBinLine',
  draw: 'RiPenNibLine',
  edit: 'RiEditLine',
  edit_note: 'RiEditBoxLine',
  rule: 'RiListCheck',
  // Estado y avisos (los cinco glifos de las etiquetas de estado son: neutro, éxito, información, aviso y peligro)
  radio_button_unchecked: 'RiCheckboxBlankCircleLine', // neutro
  done: 'RiCheckLine', // éxito
  task_alt: 'RiTaskLine',
  check_circle: 'RiCheckboxCircleLine',
  circle: 'RiCircleLine', // información
  priority_high: 'RiAlarmWarningLine', // aviso (y `warning` = RiAlertLine para los avisos generales)
  cancel: 'RiCloseCircleLine', // peligro (en la etiqueta, `close`)
  clear: 'RiCloseLine',
  error: 'RiErrorWarningLine',
  info: 'RiInformationLine',
  warning: 'RiAlertLine',
  hourglass_empty: 'RiHourglassLine',
  // Tiempo
  event: 'RiCalendarEventLine',
  history: 'RiHistoryLine',
  schedule: 'RiTimeLine',
  timer: 'RiTimerLine',
  published_with_changes: 'RiRepeatLine',
  // Personas, cuenta y seguridad
  badge: 'RiProfileLine',
  group: 'RiGroupLine',
  key: 'RiKeyLine',
  lock: 'RiLockLine',
  lock_reset: 'RiLockUnlockLine',
  password: 'RiLockPasswordLine',
  pin: 'RiLockPasswordLine',
  person: 'RiUserLine',
  person_add: 'RiUserAddLine',
  person_remove: 'RiUserUnfollowLine',
  shield: 'RiShieldCheckLine',
  visibility: 'RiEyeLine',
  visibility_off: 'RiEyeOffLine',
  // Correo, teléfono y red
  mail: 'RiMailLine',
  email: 'RiMailLine',
  mark_email_read: 'RiMailCheckLine',
  mark_email_unread: 'RiMailUnreadLine',
  phone: 'RiPhoneLine',
  sms: 'RiMessage2Line',
  smartphone: 'RiSmartphoneLine',
  lan: 'RiRouterLine',
  link: 'RiLinkM',
  link_off: 'RiLinkUnlinkM',
  language: 'RiTranslate2',
  // Tema e instalación
  brightness_auto: 'RiContrast2Line', // «Sistema»
  dark_mode: 'RiMoonLine',
  light_mode: 'RiSunLine',
  install_desktop: 'RiInstallLine',
  install_mobile: 'RiInstallLine',
  // Mapa, ruta y logística
  deployed_code: 'RiBox3Line', // paquete
  directions_car: 'RiCarLine',
  hexagon: 'RiHexagonLine',
  home_pin: 'RiHome5Line',
  inventory_2: 'RiArchiveLine',
  local_shipping: 'RiTruckLine',
  map: 'RiMapLine',
  motorcycle: 'RiMotorbikeLine',
  pin_drop: 'RiMapPinLine',
  place: 'RiMapPin2Line',
  route: 'RiRouteLine',
  scale: 'RiScales3Line', // peso
} as const;

export type MaterialIconName = keyof typeof MATERIAL_TO_REMIX;
