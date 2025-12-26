/**
 * Translation Resources for User-Aware Components
 * 
 * Contains all translatable strings for:
 * - User context messages
 * - Role-specific content
 * - Error messages
 * - Accessibility labels
 * - Status indicators
 * - Navigation elements
 */

import { TranslationResource } from './i18n';

export const ENGLISH_TRANSLATIONS: TranslationResource = {
  // Common terms
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    retry: 'Retry',
    gotIt: 'Got it'
  },

  // User context and authentication
  user: {
    welcome: 'Welcome, {{user.name}}!',
    welcomeBack: 'Welcome back, {{user.name}}!',
    guestUser: 'Guest User',
    loggedInAs: 'Logged in as {{user.name}}',
    roleLabel: 'Role: {{user.role}}',
    notAuthenticated: 'Not authenticated',
    authenticationRequired: 'Authentication required to access this feature',
    loginPrompt: 'Please log in to continue',
    logoutConfirm: 'Are you sure you want to log out?',
    sessionExpired: 'Your session has expired. Please log in again.',
    authenticationIssues: 'Authentication Issues',
    tryRecovery: 'Try Recovery',
    sessionActiveSince: 'Session active since',
    
    // Role names
    roles: {
      passenger: 'Passenger',
      official: 'Railway Official', 
      admin: 'Super Administrator'
    },
    
    // Role-specific greetings
    greeting: {
      admin: 'Hello Administrator, {{user.name}}',
      user: 'Hello {{user.name}}',
      guest: 'Hello Guest',
      moderator: 'Hello Moderator, {{user.name}}',
      support: 'Hello Support Agent, {{user.name}}'
    },

    // Status messages
    status: {
      online: 'Online',
      offline: 'Offline',
      away: 'Away',
      busy: 'Busy',
      active: 'Active {{time}} ago',
      lastSeen: 'Last seen {{date}}'
    }
  },

  // Chatbot and conversation
  chatbot: {
    title: 'Assistant',
    placeholder: 'Type your message...',
    send: 'Send message',
    thinking: 'Thinking...',
    typing: 'Assistant is typing...',
    newConversation: 'New conversation',
    clearChat: 'Clear chat',
    exportChat: 'Export conversation',
    inputHelp: 'Enter to send • Shift+Enter for new line',
    aiDisclaimer: '⚠️ AI responses may contain errors. Please verify important information.',
    
    // Voice recording
    voiceRecording: {
      title: 'Voice Recording',
      subtitle: 'Record your message',
      recordAgain: '🔄 Record again',
      startRecording: '🎤 Start Recording',
      stopRecording: '⏹️ Stop Recording',
      recordingInProgress: 'Recording in progress...',
      addText: 'Add text with your audio (optional)',
      optionalText: 'Optional text message...',
      sendAudio: 'Send Audio'
    },
    
    // Actions
    actions: {
      recordVoice: 'Record voice message',
      uploadFile: 'Upload file'
    },
    
    // Context-aware messages
    contextAware: {
      personalizedFor: 'Personalized for {{user.name}}',
      roleBasedHelp: 'Getting {{user.role}}-specific assistance',
      guestMode: 'Using guest mode - some features may be limited',
      authenticatedMode: 'Full features available'
    },

    // Suggestions based on role
    suggestions: {
      quickActionsFor: 'Quick Actions for',
      howCanHelp: 'Just tell me what you\'d like to do!',
      showQuickActions: 'Show role-specific quick actions',
      
      admin: {
        title: 'Admin tasks you might need help with:',
        items: [
          'Manage user accounts',
          'View system analytics',
          'Configure settings',
          'Review audit logs'
        ]
      },
      user: {
        title: 'Things I can help you with:',
        items: [
          'Answer questions',
          'Provide information',
          'Help with tasks',
          'Find resources'
        ]
      },
      guest: {
        title: 'As a guest, I can help you with:',
        items: [
          'General information',
          'Getting started',
          'Basic questions',
          'Navigation help'
        ]
      }
    }
  },

  // Accessibility
  accessibility: {
    labels: {
      userAvatar: '{{user.name}} avatar',
      guestAvatar: 'Guest user avatar',
      userMenu: 'User menu for {{user.name}}',
      contextIndicator: 'User context: {{status}}',
      errorIndicator: 'Error indicator',
      successIndicator: 'Success indicator',
      loadingIndicator: 'Loading indicator',
      performanceDashboard: 'Performance monitoring dashboard',
      errorDashboard: 'Error monitoring dashboard'
    },

    announcements: {
      contextChanged: 'User context updated: {{status}}',
      roleChanged: 'User role changed to {{user.role}}',
      languageChanged: 'Language changed to {{language}}',
      errorOccurred: 'Error occurred: {{error}}',
      operationComplete: '{{operation}} completed successfully',
      operationFailed: '{{operation}} failed: {{error}}',
      authRecovery: 'Retry authentication',
      quickActions: 'Show quick actions for your role'
    }
  },

  // Error messages
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network connection error. Please check your connection.',
    timeout: 'Request timed out. Please try again.',
    unauthorized: 'You are not authorized to access this resource.',
    forbidden: 'Access forbidden. Insufficient permissions.',
    notFound: 'The requested resource was not found.',
    serverError: 'Server error occurred. Please try again later.',
    
    // User context errors
    context: {
      loadFailed: 'Failed to load user context',
      updateFailed: 'Failed to update user context',
      invalidSession: 'Invalid session. Please log in again.',
      permissionDenied: 'Permission denied for this operation'
    },

    // File and media errors
    unsupportedFileType: 'Unsupported File Type',
    videoNotSupported: 'Video files are not supported at this time. Please upload an image or audio file instead.',

    // Pluralized error messages
    validation: {
      one: 'There is {{count}} validation error',
      other: 'There are {{count}} validation errors'
    }
  },

  // Performance monitoring
  performance: {
    title: 'Performance Monitor',
    metrics: {
      responseTime: 'Response Time',
      memoryUsage: 'Memory Usage',
      cacheHits: 'Cache Hits',
      errorRate: 'Error Rate',
      activeUsers: 'Active Users'
    },
    
    status: {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      critical: 'Critical'
    },

    // Time-based descriptions
    timeframes: {
      realtime: 'Real-time',
      lastMinute: 'Last minute',
      lastHour: 'Last hour',
      last24Hours: 'Last 24 hours',
      lastWeek: 'Last week'
    }
  },

  // Date and time
  datetime: {
    now: 'now',
    today: 'today',
    yesterday: 'yesterday',
    tomorrow: 'tomorrow',
    
    // Relative time
    timeAgo: {
      seconds: {
        one: '{{count}} second ago',
        other: '{{count}} seconds ago'
      },
      minutes: {
        one: '{{count}} minute ago', 
        other: '{{count}} minutes ago'
      },
      hours: {
        one: '{{count}} hour ago',
        other: '{{count}} hours ago'
      },
      days: {
        one: '{{count}} day ago',
        other: '{{count}} days ago'
      }
    }
  },

  // Navigation
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help',
    about: 'About',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms',
    
    // Breadcrumbs
    breadcrumb: {
      separator: '/',
      home: 'Home'
    }
  },

  // Language selector
  language: {
    selector: {
      title: 'Select Language',
      current: 'Current language: {{language}}',
      change: 'Change language to {{language}}'
    }
  }
};

export const SPANISH_TRANSLATIONS: TranslationResource = {
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    info: 'Información',
    close: 'Cerrar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    view: 'Ver',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    refresh: 'Actualizar',
    retry: 'Reintentar',
    gotIt: 'Entendido'
  },

  user: {
    welcome: '¡Bienvenido, {{user.name}}!',
    welcomeBack: '¡Bienvenido de vuelta, {{user.name}}!',
    guestUser: 'Usuario Invitado',
    loggedInAs: 'Conectado como {{user.name}}',
    roleLabel: 'Rol: {{user.role}}',
    notAuthenticated: 'No autenticado',
    authenticationRequired: 'Se requiere autenticación para acceder a esta función',
    loginPrompt: 'Por favor, inicie sesión para continuar',
    logoutConfirm: '¿Está seguro de que desea cerrar sesión?',
    sessionExpired: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
    authenticationIssues: 'Problemas de Autenticación',
    tryRecovery: 'Intentar Recuperación',
    sessionActiveSince: 'Sesión activa desde',
    
    // User context errors
    context: {
      loadFailed: 'Falló al cargar el contexto de usuario',
      updateFailed: 'Falló al actualizar el contexto de usuario',
      invalidSession: 'Sesión inválida. Por favor, inicie sesión nuevamente.',
      permissionDenied: 'Permiso denegado para esta operación'
    },

    // Role names
    // Role names
    roles: {
      passenger: 'Pasajero',
      official: 'Oficial Ferroviario',
      admin: 'Super Administrador'
    },

    greeting: {
      admin: 'Hola Administrador, {{user.name}}',
      user: 'Hola {{user.name}}',
      guest: 'Hola Invitado',
      moderator: 'Hola Moderador, {{user.name}}',
      support: 'Hola Agente de Soporte, {{user.name}}'
    },

    status: {
      online: 'En línea',
      offline: 'Desconectado',
      away: 'Ausente',
      busy: 'Ocupado',
      active: 'Activo hace {{time}}',
      lastSeen: 'Visto por última vez {{date}}'
    }
  },

  chatbot: {
    title: 'Asistente',
    placeholder: 'Escribe tu mensaje...',
    send: 'Enviar mensaje',
    thinking: 'Pensando...',
    typing: 'El asistente está escribiendo...',
    newConversation: 'Nueva conversación',
    clearChat: 'Limpiar chat',
    exportChat: 'Exportar conversación',
    inputHelp: 'Enter para enviar • Shift+Enter para nueva línea',
    aiDisclaimer: '⚠️ Las respuestas de IA pueden contener errores. Por favor verifica la información importante.',
    
    // Voice recording
    voiceRecording: {
      title: 'Grabación de Voz',
      subtitle: 'Graba tu mensaje',
      recordAgain: '🔄 Grabar de nuevo',
      startRecording: '🎤 Comenzar Grabación',
      stopRecording: '⏹️ Detener Grabación',
      recordingInProgress: 'Grabación en progreso...',
      addText: 'Agregar texto con tu audio (opcional)',
      optionalText: 'Mensaje de texto opcional...',
      sendAudio: 'Enviar Audio'
    },
    
    // Actions
    actions: {
      recordVoice: 'Grabar mensaje de voz',
      uploadFile: 'Subir archivo'
    },

    contextAware: {
      personalizedFor: 'Personalizado para {{user.name}}',
      roleBasedHelp: 'Obteniendo asistencia específica para {{user.role}}',
      guestMode: 'Usando modo invitado - algunas funciones pueden estar limitadas',
      authenticatedMode: 'Todas las funciones disponibles'
    },

    suggestions: {
      quickActionsFor: 'Acciones Rápidas para',
      howCanHelp: '¡Solo dime qué te gustaría hacer!',
      showQuickActions: 'Mostrar acciones rápidas específicas del rol',
      
      admin: {
        title: 'Tareas de administración en las que puedo ayudarte:',
        items: [
          'Administrar cuentas de usuario',
          'Ver análisis del sistema',
          'Configurar ajustes',
          'Revisar registros de auditoría'
        ]
      },
      user: {
        title: 'Cosas en las que puedo ayudarte:',
        items: [
          'Responder preguntas',
          'Proporcionar información',
          'Ayuda con tareas',
          'Encontrar recursos'
        ]
      },
      guest: {
        title: 'Como invitado, puedo ayudarte con:',
        items: [
          'Información general',
          'Primeros pasos',
          'Preguntas básicas',
          'Ayuda de navegación'
        ]
      }
    }
  },

  accessibility: {
    labels: {
      userAvatar: 'Avatar de {{user.name}}',
      guestAvatar: 'Avatar de usuario invitado',
      userMenu: 'Menú de usuario para {{user.name}}',
      contextIndicator: 'Contexto de usuario: {{status}}',
      errorIndicator: 'Indicador de error',
      successIndicator: 'Indicador de éxito',
      loadingIndicator: 'Indicador de carga',
      performanceDashboard: 'Panel de monitoreo de rendimiento',
      errorDashboard: 'Panel de monitoreo de errores'
    },

    announcements: {
      contextChanged: 'Contexto de usuario actualizado: {{status}}',
      roleChanged: 'Rol de usuario cambiado a {{user.role}}',
      languageChanged: 'Idioma cambiado a {{language}}',
      errorOccurred: 'Error ocurrido: {{error}}',
      operationComplete: '{{operation}} completado exitosamente',
      operationFailed: '{{operation}} falló: {{error}}',
      authRecovery: 'Reintentar autenticación',
      quickActions: 'Mostrar acciones rápidas para tu rol'
    }
  },

  errors: {
    generic: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    network: 'Error de conexión de red. Por favor, verifica tu conexión.',
    timeout: 'Tiempo de espera agotado. Por favor, inténtalo de nuevo.',
    unauthorized: 'No tienes autorización para acceder a este recurso.',
    forbidden: 'Acceso prohibido. Permisos insuficientes.',
    notFound: 'No se encontró el recurso solicitado.',
    serverError: 'Error del servidor. Por favor, inténtalo más tarde.',

    // File and media errors
    unsupportedFileType: 'Tipo de Archivo No Soportado',
    videoNotSupported: 'Los archivos de video no están soportados en este momento. Por favor sube una imagen o archivo de audio.',

    validation: {
      one: 'Hay {{count}} error de validación',
      other: 'Hay {{count}} errores de validación'
    }
  },

  performance: {
    title: 'Monitor de Rendimiento',
    metrics: {
      responseTime: 'Tiempo de Respuesta',
      memoryUsage: 'Uso de Memoria',
      cacheHits: 'Aciertos de Caché',
      errorRate: 'Tasa de Error',
      activeUsers: 'Usuarios Activos'
    },

    status: {
      excellent: 'Excelente',
      good: 'Bueno',
      fair: 'Regular',
      poor: 'Pobre',
      critical: 'Crítico'
    },

    timeframes: {
      realtime: 'Tiempo real',
      lastMinute: 'Último minuto',
      lastHour: 'Última hora',
      last24Hours: 'Últimas 24 horas',
      lastWeek: 'Última semana'
    }
  },

  datetime: {
    now: 'ahora',
    today: 'hoy',
    yesterday: 'ayer',
    tomorrow: 'mañana',

    timeAgo: {
      seconds: {
        one: 'hace {{count}} segundo',
        other: 'hace {{count}} segundos'
      },
      minutes: {
        one: 'hace {{count}} minuto',
        other: 'hace {{count}} minutos'
      },
      hours: {
        one: 'hace {{count}} hora',
        other: 'hace {{count}} horas'
      },
      days: {
        one: 'hace {{count}} día',
        other: 'hace {{count}} días'
      }
    }
  },

  navigation: {
    home: 'Inicio',
    dashboard: 'Panel',
    profile: 'Perfil',
    settings: 'Configuración',
    help: 'Ayuda',
    about: 'Acerca de',
    contact: 'Contacto',
    privacy: 'Privacidad',
    terms: 'Términos',

    breadcrumb: {
      separator: '/',
      home: 'Inicio'
    }
  },

  language: {
    selector: {
      title: 'Seleccionar Idioma',
      current: 'Idioma actual: {{language}}',
      change: 'Cambiar idioma a {{language}}'
    }
  }
};

export const FRENCH_TRANSLATIONS: TranslationResource = {
  common: {
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    warning: 'Avertissement',
    info: 'Information',
    close: 'Fermer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    view: 'Voir',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    refresh: 'Actualiser',
    retry: 'Réessayer',
    gotIt: 'Compris'
  },

  user: {
    welcome: 'Bienvenue, {{user.name}} !',
    welcomeBack: 'Content de vous revoir, {{user.name}} !',
    guestUser: 'Utilisateur Invité',
    loggedInAs: 'Connecté en tant que {{user.name}}',
    roleLabel: 'Rôle : {{user.role}}',
    notAuthenticated: 'Non authentifié',
    authenticationRequired: 'Authentification requise pour accéder à cette fonctionnalité',
    loginPrompt: 'Veuillez vous connecter pour continuer',
    logoutConfirm: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
    authenticationIssues: 'Problèmes d\'Authentification',
    tryRecovery: 'Essayer la Récupération',
    sessionActiveSince: 'Session active depuis',
    
    // User context errors
    context: {
      loadFailed: 'Échec du chargement du contexte utilisateur',
      updateFailed: 'Échec de la mise à jour du contexte utilisateur',
      invalidSession: 'Session invalide. Veuillez vous reconnecter.',
      permissionDenied: 'Permission refusée pour cette opération'
    },

    // Role names
    // Role names
    roles: {
      passenger: 'Passager',
      official: 'Agent Ferroviaire',
      admin: 'Super Administrateur'
    },

    greeting: {
      admin: 'Bonjour Administrateur, {{user.name}}',
      user: 'Bonjour {{user.name}}',
      guest: 'Bonjour Invité',
      moderator: 'Bonjour Modérateur, {{user.name}}',
      support: 'Bonjour Agent de Support, {{user.name}}'
    },

    status: {
      online: 'En ligne',
      offline: 'Hors ligne',
      away: 'Absent',
      busy: 'Occupé',
      active: 'Actif il y a {{time}}',
      lastSeen: 'Vu pour la dernière fois {{date}}'
    }
  },

  chatbot: {
    title: 'Assistant',
    placeholder: 'Tapez votre message...',
    send: 'Envoyer le message',
    thinking: 'Réflexion...',
    typing: 'L\'assistant tape...',
    newConversation: 'Nouvelle conversation',
    clearChat: 'Effacer le chat',
    exportChat: 'Exporter la conversation',
    inputHelp: 'Entrée pour envoyer • Shift+Entrée pour nouvelle ligne',
    aiDisclaimer: '⚠️ Les réponses de l\'IA peuvent contenir des erreurs. Veuillez vérifier les informations importantes.',
    
    // Voice recording
    voiceRecording: {
      title: 'Enregistrement Vocal',
      subtitle: 'Enregistrez votre message',
      recordAgain: '🔄 Enregistrer à nouveau',
      startRecording: '🎤 Commencer l\'Enregistrement',
      stopRecording: '⏹️ Arrêter l\'Enregistrement',
      recordingInProgress: 'Enregistrement en cours...',
      addText: 'Ajouter du texte avec votre audio (optionnel)',
      optionalText: 'Message texte optionnel...',
      sendAudio: 'Envoyer l\'Audio'
    },
    
    // Actions
    actions: {
      recordVoice: 'Enregistrer un message vocal',
      uploadFile: 'Télécharger un fichier'
    },

    contextAware: {
      personalizedFor: 'Personnalisé pour {{user.name}}',
      roleBasedHelp: 'Obtenir une assistance spécifique à {{user.role}}',
      guestMode: 'Mode invité - certaines fonctionnalités peuvent être limitées',
      authenticatedMode: 'Toutes les fonctionnalités disponibles'
    },

    suggestions: {
      quickActionsFor: 'Actions Rapides pour',
      howCanHelp: 'Dites-moi simplement ce que vous aimeriez faire !',
      showQuickActions: 'Afficher les actions rapides spécifiques au rôle'
    }
  },

  accessibility: {
    labels: {
      userAvatar: 'Avatar de {{user.name}}',
      guestAvatar: 'Avatar d\'utilisateur invité',
      userMenu: 'Menu utilisateur pour {{user.name}}',
      contextIndicator: 'Contexte utilisateur : {{status}}',
      errorIndicator: 'Indicateur d\'erreur',
      successIndicator: 'Indicateur de succès',
      loadingIndicator: 'Indicateur de chargement',
      performanceDashboard: 'Tableau de bord de surveillance des performances',
      errorDashboard: 'Tableau de bord de surveillance des erreurs'
    },

    announcements: {
      contextChanged: 'Contexte utilisateur mis à jour : {{status}}',
      roleChanged: 'Rôle utilisateur changé en {{user.role}}',
      languageChanged: 'Langue changée en {{language}}',
      errorOccurred: 'Erreur survenue : {{error}}',
      operationComplete: '{{operation}} terminé avec succès',
      operationFailed: '{{operation}} a échoué : {{error}}',
      authRecovery: 'Réessayer l\'authentification',
      quickActions: 'Afficher les actions rapides pour votre rôle'
    }
  },

  errors: {
    generic: 'Quelque chose s\'est mal passé. Veuillez réessayer.',
    network: 'Erreur de connexion réseau. Veuillez vérifier votre connexion.',
    timeout: 'Délai d\'attente dépassé. Veuillez réessayer.',
    unauthorized: 'Vous n\'êtes pas autorisé à accéder à cette ressource.',
    forbidden: 'Accès interdit. Permissions insuffisantes.',
    notFound: 'La ressource demandée n\'a pas été trouvée.',
    serverError: 'Erreur du serveur. Veuillez réessayer plus tard.',

    // File and media errors
    unsupportedFileType: 'Type de Fichier Non Supporté',
    videoNotSupported: 'Les fichiers vidéo ne sont pas supportés pour le moment. Veuillez télécharger une image ou un fichier audio.',

    validation: {
      one: 'Il y a {{count}} erreur de validation',
      other: 'Il y a {{count}} erreurs de validation'
    }
  },

  language: {
    selector: {
      title: 'Sélectionner la Langue',
      current: 'Langue actuelle : {{language}}',
      change: 'Changer la langue en {{language}}'
    }
  }
};