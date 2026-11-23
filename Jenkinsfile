// Vigilancia de la aplicación: Jenkins consulta GET /healthCheck cada 5 minutos y envía un correo si no responde 200 (y otro al recuperarse).
// Crea un trabajo «Pipeline from SCM» apuntando a este repositorio. Necesita un agente con `curl` y el correo de Jenkins configurado
// (Manage Jenkins > System > E-mail Notification). Para avisar por Slack, Teams, etc., cambia los dos `mail` por el paso de ese plugin.
pipeline {
  agent any
  triggers { cron('H/5 * * * *') }
  options { timeout(time: 2, unit: 'MINUTES') }
  parameters {
    string(name: 'HEALTH_URL', defaultValue: 'https://ruteando.example.invalid/healthCheck', description: 'URL pública de /healthCheck')
    string(name: 'ALERT_EMAIL', defaultValue: 'equipo@example.invalid', description: 'Quién recibe el aviso')
  }
  stages {
    stage('healthCheck') {
      steps {
        // --fail: cualquier respuesta que no sea 2xx falla el trabajo; 3 intentos separados 10 s evitan avisar por un parpadeo
        sh 'curl --silent --show-error --fail --max-time 10 --retry 2 --retry-delay 10 --retry-all-errors "$HEALTH_URL"'
      }
    }
  }
  post {
    failure {
      mail to: params.ALERT_EMAIL, subject: "CAÍDA: Ruteando no responde (${params.HEALTH_URL})", body: "El healthCheck falló. Detalle: ${env.BUILD_URL}console"
    }
    fixed {
      mail to: params.ALERT_EMAIL, subject: 'Ruteando se recuperó', body: "El healthCheck vuelve a responder 200. ${env.BUILD_URL}"
    }
  }
}
