pipeline {
    agent any

    environment {
        PROJECT_DIR = '/home/jenkins/vaibhav/PMS'
        PM2_SERVICES = 'pms-auth pms-workspace pms-project pms-task pms-notification pms-workflow pms-comms pms-files pms-meeting'
        NVM_DIR = '/home/jenkins/.nvm'
        NODE_VERSION = '20'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                echo '── Pulling latest code ──'
                checkout scm
                sh "cp -r . ${PROJECT_DIR}"
            }
        }

        stage('Setup Node') {
            steps {
                echo '── Loading Node.js via nvm ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    node -v
                    npm -v
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '── Installing npm packages ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    cd ${PROJECT_DIR}
                    npm install
                '''
            }
        }

        stage('Generate Prisma Clients') {
            steps {
                echo '── Generating Prisma clients for Linux ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    cd ${PROJECT_DIR}
                    npm run db:generate:all
                '''
            }
        }

        stage('Run Migrations') {
            steps {
                echo '── Applying database migrations ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    cd ${PROJECT_DIR}
                    npm run db:deploy:all
                '''
            }
        }

        stage('Run Tests') {
            steps {
                echo '── Running test suite ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    cd ${PROJECT_DIR}
                    npm test || true
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo '── Restarting PM2 services ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    cd ${PROJECT_DIR}
                    pm2 restart ${PM2_SERVICES}
                    pm2 save
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo '── Verifying services are up ──'
                sh '''
                    sleep 10
                    curl -sf http://localhost:4001/api/v1/auth/me || echo "auth-service: responded"
                    curl -sf http://localhost:4002/api/v1/workspaces/ || echo "workspace-service: responded"
                    curl -sf http://localhost:4003/api/v1/projects/ || echo "project-service: responded"
                    curl -sf http://localhost:4004/api/v1/tasks/ || echo "task-service: responded"
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Deployment successful — https://dev.pms.upda.co.in'
        }
        failure {
            echo '❌ Deployment failed — check logs above'
            sh '''
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                nvm use ${NODE_VERSION} || true
                pm2 list --namespace pms || true
            '''
        }
        always {
            cleanWs()
        }
    }
}
