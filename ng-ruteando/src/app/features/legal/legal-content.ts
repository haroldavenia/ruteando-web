import { Language } from '../../core/i18n/i18n';
import { LegalDoc } from './legal-docs';

/**
 * Texto de los documentos legales, por idioma. BORRADOR sin revisión legal (ver `LEGAL_INFO` en `legal-docs.ts`).
 * Describe lo que la aplicación hace hoy; si cambia (un proveedor nuevo, un dato nuevo), se actualiza aquí en los tres idiomas.
 * No pasa por el diccionario de `t()`: son textos largos y cada idioma se redacta completo.
 */
export interface LegalSection {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
}

export interface LegalText {
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

/** Cierre común de cada idioma: `{email}` es el correo de contacto, si se configuró. */
export interface LegalContact {
  readonly heading: string;
  readonly withEmail: string;
  readonly withoutEmail: string;
}

export const LEGAL_CONTACT: Record<Language, LegalContact> = {
  es: {
    heading: 'Contacto',
    withEmail: 'Para ejercer tus derechos o resolver dudas, escribe a {email}.',
    withoutEmail:
      'Para ejercer tus derechos o resolver dudas, contacta a la persona que administra Ruteando en tu empresa.',
  },
  en: {
    heading: 'Contact',
    withEmail: 'To exercise your rights or ask any question, write to {email}.',
    withoutEmail:
      'To exercise your rights or ask any question, contact the person who manages Ruteando in your company.',
  },
  pt: {
    heading: 'Contacto',
    withEmail: 'Para exercer os seus direitos ou esclarecer dúvidas, escreva para {email}.',
    withoutEmail:
      'Para exercer os seus direitos ou esclarecer dúvidas, contacte a pessoa que administra o Ruteando na sua empresa.',
  },
};

export const LEGAL: Record<Language, Record<LegalDoc, LegalText>> = {
  es: {
    privacy: {
      intro:
        'Esta política explica qué datos trata Ruteando cuando usas la aplicación, para qué los usa y qué control tienes sobre ellos.',
      sections: [
        {
          heading: 'Quién decide sobre los datos',
          paragraphs: [
            'Ruteando es una aplicación de planificación de rutas. Tu empresa (la organización que te invitó o en la que creaste tu cuenta) decide qué datos operativos carga y quién los ve. Ruteando los procesa para prestar el servicio.',
          ],
        },
        {
          heading: 'Qué datos tratamos',
          items: [
            'Cuenta: tu nombre, correo electrónico, rol y empresa.',
            'Operación: los paquetes, lugares, zonas, vehículos, conductores, jornadas y rutas que tu empresa registra, incluidas direcciones y coordenadas.',
            'Seguridad: si activas la verificación en dos pasos, tu teléfono (para el SMS), el secreto cifrado de tu aplicación autenticadora, la huella (no el código) de tus códigos de recuperación y un registro de eventos de seguridad.',
            'Auditoría: un registro de las acciones realizadas en la cuenta de tu empresa (quién, qué y cuándo).',
          ],
        },
        {
          heading: 'Para qué los usamos',
          paragraphs: [
            'Para prestar y proteger el servicio, planificar rutas, verificar tu identidad, enviarte códigos de verificación y mensajes de la cuenta (confirmar tu correo, recuperar tu contraseña) y cumplir obligaciones legales.',
            'No vendemos tus datos ni los usamos para publicidad.',
          ],
        },
        {
          heading: 'Con quién los compartimos',
          paragraphs: ['Solo con proveedores que los procesan por encargo nuestro:'],
          items: [
            'El servicio de datos (HanoIT Gateway), que guarda la información de la cuenta y de la operación.',
            'El proveedor de correo electrónico, para enviar códigos y avisos.',
            'Twilio, únicamente si activas el SMS: recibe tu número de teléfono y entrega el código.',
            'OpenStreetMap, que recibe tu dirección IP al cargar las teselas del mapa, y Google Fonts, que la recibe al cargar las tipografías.',
          ],
        },
        {
          heading: 'Lo que se guarda en tu dispositivo',
          paragraphs: [
            'Guardamos en el navegador lo necesario para mantener tu sesión y tus preferencias (idioma, tema y densidad de las listas). La aplicación no usa herramientas de analítica ni de publicidad, ni cookies de seguimiento.',
          ],
        },
        {
          heading: 'Seguridad',
          paragraphs: [
            'Protegemos los datos con conexiones cifradas, límites de intentos, secretos de la aplicación autenticadora cifrados y códigos de recuperación guardados solo como huella. Ningún sistema es infalible: si detectamos un incidente que te afecte, te lo comunicaremos.',
          ],
        },
        {
          heading: 'Cuánto tiempo los conservamos',
          paragraphs: [
            'Mientras tu cuenta esté activa y durante el tiempo necesario para cumplir obligaciones legales. Cuando una empresa o una persona deja de usar el servicio, sus datos se eliminan o anonimizan en un plazo razonable.',
          ],
        },
        {
          heading: 'Tus derechos',
          paragraphs: [
            'Puedes pedir acceso a tus datos, corregirlos, eliminarlos, oponerte a su uso o llevártelos. Puedes desactivar el SMS o la aplicación autenticadora en tu Perfil cuando quieras (te pedirá un código). Si tu empresa exige la verificación en dos pasos, necesitarás tener otro método activo.',
          ],
        },
        {
          heading: 'Cambios en esta política',
          paragraphs: [
            'Si la actualizamos de forma importante, lo avisaremos en la aplicación. La fecha de la última revisión aparece al inicio.',
          ],
        },
      ],
    },
    terms: {
      intro:
        'Ruteando es un servicio de Hanoit, LLC. Al usar Ruteando aceptas estos términos. Si no estás de acuerdo con ellos, no uses la aplicación.',
      sections: [
        {
          heading: 'El servicio',
          paragraphs: [
            'Ruteando permite planificar y seguir rutas: gestionar flota, lugares, paquetes, zonas y jornadas. Las rutas que calcula son una ayuda a la planificación: la persona responsable de la operación decide si las aplica y debe revisarlas antes.',
          ],
        },
        {
          heading: 'Tu cuenta',
          paragraphs: [
            'Eres responsable de mantener la confidencialidad de tu contraseña y de tus métodos de verificación, y de lo que se haga con tu cuenta. Avísanos si sospechas un uso no autorizado. Te recomendamos activar la verificación en dos pasos.',
          ],
        },
        {
          heading: 'Uso aceptable',
          items: [
            'No uses el servicio para fines ilícitos ni para vulnerar derechos de otras personas.',
            'No intentes acceder a datos o cuentas que no te corresponden, ni eludir los límites de seguridad.',
            'No interfieras con el funcionamiento del servicio ni lo sobrecargues de forma abusiva.',
          ],
        },
        {
          heading: 'Los datos de tu empresa',
          paragraphs: [
            'Los datos que carga tu empresa siguen siendo suyos. Quien administra la empresa decide qué personas acceden y con qué rol, y es responsable de contar con el derecho a tratar los datos de paquetes, lugares y personas que registra.',
          ],
        },
        {
          heading: 'Disponibilidad y cambios',
          paragraphs: [
            'Procuramos que el servicio esté disponible, pero no garantizamos que funcione sin interrupciones ni errores. Podemos mejorar, cambiar o retirar funciones avisando cuando sea razonable.',
          ],
        },
        {
          heading: 'Propiedad intelectual',
          paragraphs: [
            'La aplicación, su diseño y su marca son de sus titulares. Estos términos no te transfieren ningún derecho sobre ellos más allá de usar el servicio.',
          ],
        },
        {
          heading: 'Limitación de responsabilidad',
          paragraphs: [
            'En la medida que permita la ley, no respondemos por daños indirectos ni por pérdidas derivadas del uso o de la imposibilidad de usar el servicio, incluidas las decisiones de operación tomadas a partir de las rutas calculadas.',
          ],
        },
        {
          heading: 'Suspensión y terminación',
          paragraphs: [
            'Podemos suspender una cuenta que incumpla estos términos o ponga en riesgo la seguridad del servicio. Puedes dejar de usar Ruteando cuando quieras.',
          ],
        },
        {
          heading: 'Cambios en estos términos',
          paragraphs: [
            'Podemos actualizarlos. Si el cambio es importante, lo avisaremos en la aplicación; seguir usando el servicio después supone aceptarlo.',
          ],
        },
      ],
    },
    sms: {
      intro:
        'Esta página explica los mensajes SMS que Ruteando envía para la verificación en dos pasos y cómo dejar de recibirlos.',
      sections: [
        {
          heading: 'Qué mensajes enviamos',
          paragraphs: [
            'Si activas la verificación en dos pasos por SMS, te enviamos un código de un solo uso a tu teléfono cuando inicias sesión o confirmas un cambio de seguridad.',
          ],
        },
        {
          heading: 'Tu consentimiento',
          paragraphs: [
            'Al registrar tu número y activar el SMS aceptas recibir esos mensajes. Solo enviamos códigos de verificación: no enviamos publicidad ni promociones.',
          ],
        },
        {
          heading: 'Frecuencia',
          paragraphs: [
            'Un mensaje por cada código que solicitas. Para proteger tu cuenta hay un límite de envíos por persona en un periodo corto.',
          ],
        },
        {
          heading: 'Costos',
          paragraphs: [
            'Ruteando no te cobra por estos mensajes, pero tu operador puede aplicar tarifas de mensajes y de datos.',
          ],
        },
        {
          heading: 'Cómo dejar de recibirlos',
          paragraphs: [
            'Desactiva el método SMS en Perfil, Verificación en dos pasos (te pedirá un código), o responde STOP a un mensaje donde tu operador lo permita. Si tu empresa exige la verificación en dos pasos, necesitarás tener otro método activo.',
          ],
        },
        {
          heading: 'Quién envía los mensajes',
          paragraphs: [
            'Usamos Twilio para entregar los SMS: recibe tu número de teléfono y el texto del código. Más información en la política de privacidad.',
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      intro:
        'This policy explains what data Ruteando handles when you use the application, what it uses it for and what control you have over it.',
      sections: [
        {
          heading: 'Who decides about the data',
          paragraphs: [
            'Ruteando is a route planning application. Your company (the organization that invited you or where you created your account) decides what operational data it uploads and who can see it. Ruteando processes that data to provide the service.',
          ],
        },
        {
          heading: 'What data we handle',
          items: [
            'Account: your name, email address, role and company.',
            'Operations: the packages, places, zones, vehicles, drivers, journeys and routes your company records, including addresses and coordinates.',
            'Security: if you turn on two-step verification, your phone number (for SMS), the encrypted secret of your authenticator app, the fingerprint (not the code) of your recovery codes and a log of security events.',
            'Audit: a record of the actions taken in your company account (who, what and when).',
          ],
        },
        {
          heading: 'What we use it for',
          paragraphs: [
            'To provide and protect the service, plan routes, verify your identity, send you verification codes and account messages (confirming your email, resetting your password) and meet legal obligations.',
            'We do not sell your data or use it for advertising.',
          ],
        },
        {
          heading: 'Who we share it with',
          paragraphs: ['Only with providers that process it on our behalf:'],
          items: [
            'The data service (HanoIT Gateway), which stores the account and operations information.',
            'The email provider, to send codes and notices.',
            'Twilio, only if you turn on SMS: it receives your phone number and delivers the code.',
            'OpenStreetMap, which receives your IP address when loading map tiles, and Google Fonts, which receives it when loading typefaces.',
          ],
        },
        {
          heading: 'What is stored on your device',
          paragraphs: [
            'We keep in the browser what is needed to maintain your session and preferences (language, theme and list density). The application does not use analytics or advertising tools, or tracking cookies.',
          ],
        },
        {
          heading: 'Security',
          paragraphs: [
            'We protect data with encrypted connections, attempt limits, encrypted authenticator secrets and recovery codes stored only as fingerprints. No system is infallible: if we detect an incident that affects you, we will tell you.',
          ],
        },
        {
          heading: 'How long we keep it',
          paragraphs: [
            'While your account is active and for as long as needed to meet legal obligations. When a company or person stops using the service, their data is deleted or anonymized within a reasonable time.',
          ],
        },
        {
          heading: 'Your rights',
          paragraphs: [
            'You can ask for access to your data, correct it, delete it, object to its use or take it with you. You can turn off SMS or the authenticator app in your Profile at any time (it will ask for a code). If your company requires two-step verification, you will need another method turned on.',
          ],
        },
        {
          heading: 'Changes to this policy',
          paragraphs: [
            'If we make a significant update, we will let you know in the application. The date of the latest review appears at the top.',
          ],
        },
      ],
    },
    terms: {
      intro:
        'Ruteando is a service by Hanoit, LLC. By using Ruteando you accept these terms. If you do not agree with them, do not use the application.',
      sections: [
        {
          heading: 'The service',
          paragraphs: [
            'Ruteando lets you plan and follow routes: manage fleet, places, packages, zones and journeys. The routes it calculates are a planning aid: the person responsible for the operation decides whether to apply them and must review them first.',
          ],
        },
        {
          heading: 'Your account',
          paragraphs: [
            'You are responsible for keeping your password and verification methods confidential, and for what is done with your account. Tell us if you suspect unauthorized use. We recommend turning on two-step verification.',
          ],
        },
        {
          heading: 'Acceptable use',
          items: [
            'Do not use the service for unlawful purposes or to infringe the rights of others.',
            'Do not try to access data or accounts that are not yours, or bypass security limits.',
            'Do not interfere with the operation of the service or overload it abusively.',
          ],
        },
        {
          heading: 'Your company data',
          paragraphs: [
            'The data your company uploads remains its own. Whoever manages the company decides which people have access and with what role, and is responsible for having the right to handle the package, place and people data it records.',
          ],
        },
        {
          heading: 'Availability and changes',
          paragraphs: [
            'We aim to keep the service available, but we do not guarantee that it will work without interruptions or errors. We may improve, change or remove features, giving notice when reasonable.',
          ],
        },
        {
          heading: 'Intellectual property',
          paragraphs: [
            'The application, its design and its brand belong to their owners. These terms do not transfer any right over them to you beyond using the service.',
          ],
        },
        {
          heading: 'Limitation of liability',
          paragraphs: [
            'To the extent permitted by law, we are not liable for indirect damages or losses arising from using or being unable to use the service, including operational decisions made from the calculated routes.',
          ],
        },
        {
          heading: 'Suspension and termination',
          paragraphs: [
            'We may suspend an account that breaches these terms or puts the security of the service at risk. You may stop using Ruteando at any time.',
          ],
        },
        {
          heading: 'Changes to these terms',
          paragraphs: [
            'We may update them. If the change is significant, we will let you know in the application; continuing to use the service afterwards means accepting it.',
          ],
        },
      ],
    },
    sms: {
      intro:
        'This page explains the SMS messages Ruteando sends for two-step verification and how to stop receiving them.',
      sections: [
        {
          heading: 'What messages we send',
          paragraphs: [
            'If you turn on two-step verification by SMS, we send a one-time code to your phone when you sign in or confirm a security change.',
          ],
        },
        {
          heading: 'Your consent',
          paragraphs: [
            'By registering your number and turning on SMS you agree to receive those messages. We only send verification codes: we do not send advertising or promotions.',
          ],
        },
        {
          heading: 'Frequency',
          paragraphs: [
            'One message for each code you request. To protect your account there is a limit on sends per person in a short period.',
          ],
        },
        {
          heading: 'Costs',
          paragraphs: [
            'Ruteando does not charge you for these messages, but your carrier may apply message and data rates.',
          ],
        },
        {
          heading: 'How to stop receiving them',
          paragraphs: [
            'Turn off the SMS method in Profile, Two-step verification (it will ask for a code), or reply STOP to a message where your carrier allows it. If your company requires two-step verification, you will need another method turned on.',
          ],
        },
        {
          heading: 'Who sends the messages',
          paragraphs: [
            'We use Twilio to deliver the SMS: it receives your phone number and the text of the code. More information in the privacy policy.',
          ],
        },
      ],
    },
  },
  pt: {
    privacy: {
      intro:
        'Esta política explica que dados o Ruteando trata quando utiliza a aplicação, para que os usa e que controlo tem sobre eles.',
      sections: [
        {
          heading: 'Quem decide sobre os dados',
          paragraphs: [
            'O Ruteando é uma aplicação de planeamento de rotas. A sua empresa (a organização que o convidou ou onde criou a sua conta) decide que dados operacionais carrega e quem os vê. O Ruteando trata-os para prestar o serviço.',
          ],
        },
        {
          heading: 'Que dados tratamos',
          items: [
            'Conta: o seu nome, correio eletrónico, perfil e empresa.',
            'Operação: os pacotes, locais, zonas, veículos, condutores, jornadas e rotas que a sua empresa regista, incluindo moradas e coordenadas.',
            'Segurança: se ativar a verificação em dois passos, o seu telefone (para o SMS), o segredo cifrado da sua aplicação de autenticação, a impressão digital (não o código) dos seus códigos de recuperação e um registo de eventos de segurança.',
            'Auditoria: um registo das ações realizadas na conta da sua empresa (quem, o quê e quando).',
          ],
        },
        {
          heading: 'Para que os usamos',
          paragraphs: [
            'Para prestar e proteger o serviço, planear rotas, verificar a sua identidade, enviar-lhe códigos de verificação e mensagens da conta (confirmar o seu correio, recuperar a sua palavra-passe) e cumprir obrigações legais.',
            'Não vendemos os seus dados nem os usamos para publicidade.',
          ],
        },
        {
          heading: 'Com quem os partilhamos',
          paragraphs: ['Apenas com fornecedores que os tratam por nossa conta:'],
          items: [
            'O serviço de dados (HanoIT Gateway), que guarda a informação da conta e da operação.',
            'O fornecedor de correio eletrónico, para enviar códigos e avisos.',
            'A Twilio, apenas se ativar o SMS: recebe o seu número de telefone e entrega o código.',
            'O OpenStreetMap, que recebe o seu endereço IP ao carregar os mosaicos do mapa, e o Google Fonts, que o recebe ao carregar as tipografias.',
          ],
        },
        {
          heading: 'O que se guarda no seu dispositivo',
          paragraphs: [
            'Guardamos no navegador o necessário para manter a sua sessão e as suas preferências (idioma, tema e densidade das listas). A aplicação não usa ferramentas de análise nem de publicidade, nem cookies de seguimento.',
          ],
        },
        {
          heading: 'Segurança',
          paragraphs: [
            'Protegemos os dados com ligações cifradas, limites de tentativas, segredos da aplicação de autenticação cifrados e códigos de recuperação guardados apenas como impressão digital. Nenhum sistema é infalível: se detetarmos um incidente que o afete, comunicar-lho-emos.',
          ],
        },
        {
          heading: 'Durante quanto tempo os conservamos',
          paragraphs: [
            'Enquanto a sua conta estiver ativa e durante o tempo necessário para cumprir obrigações legais. Quando uma empresa ou pessoa deixa de usar o serviço, os seus dados são eliminados ou anonimizados num prazo razoável.',
          ],
        },
        {
          heading: 'Os seus direitos',
          paragraphs: [
            'Pode pedir acesso aos seus dados, corrigi-los, eliminá-los, opor-se à sua utilização ou levá-los consigo. Pode desativar o SMS ou a aplicação de autenticação no seu Perfil quando quiser (será pedido um código). Se a sua empresa exigir a verificação em dois passos, precisará de ter outro método ativo.',
          ],
        },
        {
          heading: 'Alterações a esta política',
          paragraphs: [
            'Se a atualizarmos de forma importante, avisaremos na aplicação. A data da última revisão aparece no início.',
          ],
        },
      ],
    },
    terms: {
      intro:
        'O Ruteando é um serviço da Hanoit, LLC. Ao usar o Ruteando aceita estes termos. Se não concordar com eles, não use a aplicação.',
      sections: [
        {
          heading: 'O serviço',
          paragraphs: [
            'O Ruteando permite planear e acompanhar rotas: gerir frota, locais, pacotes, zonas e jornadas. As rotas que calcula são um apoio ao planeamento: a pessoa responsável pela operação decide se as aplica e deve revê-las antes.',
          ],
        },
        {
          heading: 'A sua conta',
          paragraphs: [
            'É responsável por manter confidenciais a sua palavra-passe e os seus métodos de verificação, e por tudo o que se faça com a sua conta. Avise-nos se suspeitar de uma utilização não autorizada. Recomendamos ativar a verificação em dois passos.',
          ],
        },
        {
          heading: 'Utilização aceitável',
          items: [
            'Não use o serviço para fins ilícitos nem para violar direitos de outras pessoas.',
            'Não tente aceder a dados ou contas que não lhe correspondam, nem contornar os limites de segurança.',
            'Não interfira com o funcionamento do serviço nem o sobrecarregue de forma abusiva.',
          ],
        },
        {
          heading: 'Os dados da sua empresa',
          paragraphs: [
            'Os dados que a sua empresa carrega continuam a ser seus. Quem administra a empresa decide que pessoas acedem e com que perfil, e é responsável por ter o direito de tratar os dados de pacotes, locais e pessoas que regista.',
          ],
        },
        {
          heading: 'Disponibilidade e alterações',
          paragraphs: [
            'Procuramos que o serviço esteja disponível, mas não garantimos que funcione sem interrupções nem erros. Podemos melhorar, alterar ou retirar funções, avisando quando for razoável.',
          ],
        },
        {
          heading: 'Propriedade intelectual',
          paragraphs: [
            'A aplicação, o seu design e a sua marca pertencem aos seus titulares. Estes termos não lhe transferem nenhum direito sobre eles para além de usar o serviço.',
          ],
        },
        {
          heading: 'Limitação de responsabilidade',
          paragraphs: [
            'Na medida em que a lei o permita, não respondemos por danos indiretos nem por perdas decorrentes da utilização ou da impossibilidade de usar o serviço, incluindo as decisões de operação tomadas a partir das rotas calculadas.',
          ],
        },
        {
          heading: 'Suspensão e cessação',
          paragraphs: [
            'Podemos suspender uma conta que incumpra estes termos ou ponha em risco a segurança do serviço. Pode deixar de usar o Ruteando quando quiser.',
          ],
        },
        {
          heading: 'Alterações a estes termos',
          paragraphs: [
            'Podemos atualizá-los. Se a alteração for importante, avisaremos na aplicação; continuar a usar o serviço depois implica aceitá-la.',
          ],
        },
      ],
    },
    sms: {
      intro:
        'Esta página explica as mensagens SMS que o Ruteando envia para a verificação em dois passos e como deixar de as receber.',
      sections: [
        {
          heading: 'Que mensagens enviamos',
          paragraphs: [
            'Se ativar a verificação em dois passos por SMS, enviamos um código de utilização única para o seu telefone quando inicia sessão ou confirma uma alteração de segurança.',
          ],
        },
        {
          heading: 'O seu consentimento',
          paragraphs: [
            'Ao registar o seu número e ativar o SMS aceita receber essas mensagens. Enviamos apenas códigos de verificação: não enviamos publicidade nem promoções.',
          ],
        },
        {
          heading: 'Frequência',
          paragraphs: [
            'Uma mensagem por cada código que solicita. Para proteger a sua conta existe um limite de envios por pessoa num período curto.',
          ],
        },
        {
          heading: 'Custos',
          paragraphs: [
            'O Ruteando não lhe cobra por estas mensagens, mas o seu operador pode aplicar tarifas de mensagens e de dados.',
          ],
        },
        {
          heading: 'Como deixar de as receber',
          paragraphs: [
            'Desative o método SMS em Perfil, Verificação em dois passos (será pedido um código), ou responda STOP a uma mensagem onde o seu operador o permita. Se a sua empresa exigir a verificação em dois passos, precisará de ter outro método ativo.',
          ],
        },
        {
          heading: 'Quem envia as mensagens',
          paragraphs: [
            'Usamos a Twilio para entregar os SMS: recebe o seu número de telefone e o texto do código. Mais informação na política de privacidade.',
          ],
        },
      ],
    },
  },
};
