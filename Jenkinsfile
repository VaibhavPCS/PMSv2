pipeline {
    agent any

    environment {
        PROJECT_DIR  = "${WORKSPACE}/build"
        NVM_DIR      = '/home/jenkins/.nvm'
        NODE_VERSION = '20'
        REGISTRY     = '192.168.1.226:5000'   // local Docker registry on the server
        IMAGE_TAG    = "${BUILD_NUMBER}"
        NAMESPACE    = 'pms'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    stages {

        // ─── 1. PULL FROM GITHUB ────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo '── Pulling code from GitHub ──'
                checkout scm
                sh "mkdir -p ${PROJECT_DIR}"
                sh "rsync -a --delete --exclude='.git' --exclude='node_modules' ./ ${PROJECT_DIR}/"
            }
        }

        // ─── 2. INJECT .ENV FILES FROM JENKINS CREDENTIALS ─────────────────
        stage('Inject Secrets') {
            steps {
                echo '── Writing .env files from Jenkins credentials ──'
                withCredentials([
                    file(credentialsId: 'pms-root-env',         variable: 'ROOT_ENV'),
                    file(credentialsId: 'pms-auth-env',         variable: 'AUTH_ENV'),
                    file(credentialsId: 'pms-workspace-env',    variable: 'WORKSPACE_ENV'),
                    file(credentialsId: 'pms-project-env',      variable: 'PROJECT_ENV'),
                    file(credentialsId: 'pms-task-env',         variable: 'TASK_ENV'),
                    file(credentialsId: 'pms-notification-env', variable: 'NOTIFICATION_ENV'),
                    file(credentialsId: 'pms-workflow-env',     variable: 'WORKFLOW_ENV'),
                    file(credentialsId: 'pms-comms-env',        variable: 'COMMS_ENV'),
                    file(credentialsId: 'pms-files-env',        variable: 'FILES_ENV'),
                    file(credentialsId: 'pms-meeting-env',      variable: 'MEETING_ENV')
                ]) {
                    sh '''
                        cp "$ROOT_ENV"         ${PROJECT_DIR}/.env
                        cp "$AUTH_ENV"         ${PROJECT_DIR}/services/auth-service/.env
                        cp "$WORKSPACE_ENV"    ${PROJECT_DIR}/services/workspace-service/.env
                        cp "$PROJECT_ENV"      ${PROJECT_DIR}/services/project-service/.env
                        cp "$TASK_ENV"         ${PROJECT_DIR}/services/task-service/.env
                        cp "$NOTIFICATION_ENV" ${PROJECT_DIR}/services/notification-service/.env
                        cp "$WORKFLOW_ENV"     ${PROJECT_DIR}/services/workflow-engine/.env
                        cp "$COMMS_ENV"        ${PROJECT_DIR}/services/comms-service/.env
                        cp "$FILES_ENV"        ${PROJECT_DIR}/services/file-services/.env
                        cp "$MEETING_ENV"      ${PROJECT_DIR}/services/meeting-service/.env
                        echo "All .env files injected."
                    '''
                }
            }
        }

        // ─── 3. INSTALL DEPENDENCIES ────────────────────────────────────────
        stage('Install') {
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

        // ─── 4. GENERATE PRISMA CLIENTS ─────────────────────────────────────
        stage('Generate Prisma') {
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

        // ─── 5. RUN TESTS ───────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo '── Running tests ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    cd ${PROJECT_DIR}
                    npm test
                '''
            }
        }

        // ─── 6. BUILD DOCKER IMAGES ─────────────────────────────────────────
        stage('Build Docker Images') {
            steps {
                echo '── Building Docker images ──'
                sh '''
                    cd ${PROJECT_DIR}
                    docker build -f services/auth-service/Dockerfile         -t ${REGISTRY}/pms-auth:${IMAGE_TAG}         -t ${REGISTRY}/pms-auth:latest         .
                    docker build -f services/workspace-service/Dockerfile    -t ${REGISTRY}/pms-workspace:${IMAGE_TAG}    -t ${REGISTRY}/pms-workspace:latest    .
                    docker build -f services/project-service/Dockerfile      -t ${REGISTRY}/pms-project:${IMAGE_TAG}      -t ${REGISTRY}/pms-project:latest      .
                    docker build -f services/task-service/Dockerfile         -t ${REGISTRY}/pms-task:${IMAGE_TAG}         -t ${REGISTRY}/pms-task:latest         .
                    docker build -f services/notification-service/Dockerfile -t ${REGISTRY}/pms-notification:${IMAGE_TAG} -t ${REGISTRY}/pms-notification:latest .
                    docker build -f services/workflow-engine/Dockerfile      -t ${REGISTRY}/pms-workflow:${IMAGE_TAG}     -t ${REGISTRY}/pms-workflow:latest     .
                    docker build -f services/comms-service/Dockerfile        -t ${REGISTRY}/pms-comms:${IMAGE_TAG}        -t ${REGISTRY}/pms-comms:latest        .
                    docker build -f services/file-services/Dockerfile        -t ${REGISTRY}/pms-files:${IMAGE_TAG}        -t ${REGISTRY}/pms-files:latest        .
                    docker build -f services/meeting-service/Dockerfile      -t ${REGISTRY}/pms-meeting:${IMAGE_TAG}      -t ${REGISTRY}/pms-meeting:latest      .
                '''
            }
        }

        // ─── 7. PUSH TO LOCAL REGISTRY ──────────────────────────────────────
        stage('Push Images') {
            steps {
                echo '── Pushing images to local registry ──'
                sh '''
                    docker push ${REGISTRY}/pms-auth:${IMAGE_TAG}         && docker push ${REGISTRY}/pms-auth:latest
                    docker push ${REGISTRY}/pms-workspace:${IMAGE_TAG}    && docker push ${REGISTRY}/pms-workspace:latest
                    docker push ${REGISTRY}/pms-project:${IMAGE_TAG}      && docker push ${REGISTRY}/pms-project:latest
                    docker push ${REGISTRY}/pms-task:${IMAGE_TAG}         && docker push ${REGISTRY}/pms-task:latest
                    docker push ${REGISTRY}/pms-notification:${IMAGE_TAG} && docker push ${REGISTRY}/pms-notification:latest
                    docker push ${REGISTRY}/pms-workflow:${IMAGE_TAG}     && docker push ${REGISTRY}/pms-workflow:latest
                    docker push ${REGISTRY}/pms-comms:${IMAGE_TAG}        && docker push ${REGISTRY}/pms-comms:latest
                    docker push ${REGISTRY}/pms-files:${IMAGE_TAG}        && docker push ${REGISTRY}/pms-files:latest
                    docker push ${REGISTRY}/pms-meeting:${IMAGE_TAG}      && docker push ${REGISTRY}/pms-meeting:latest
                '''
            }
        }

        // ─── 8. RUN DB MIGRATIONS ───────────────────────────────────────────
        stage('Migrate DB') {
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

        // ─── 9. DEPLOY TO KUBERNETES ────────────────────────────────────────
        stage('Deploy to K8s') {
            steps {
                echo '── Deploying to Kubernetes ──'
                sh '''
                    # Update image tags in manifests
                    sed -i "s|YOUR_REGISTRY|${REGISTRY}|g" ${PROJECT_DIR}/k8s/services.yaml
                    sed -i "s|:latest|:${IMAGE_TAG}|g"     ${PROJECT_DIR}/k8s/services.yaml

                    # Apply manifests
                    kubectl apply -f ${PROJECT_DIR}/k8s/namespace-and-secrets.yaml
                    kubectl apply -f ${PROJECT_DIR}/k8s/services.yaml
                    kubectl apply -f ${PROJECT_DIR}/k8s/ingress.yaml

                    # Wait for rollout
                    kubectl rollout status deployment/pms-auth         -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-workspace     -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-project       -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-task          -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-notification  -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-workflow      -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-comms         -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-files         -n ${NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/pms-meeting       -n ${NAMESPACE} --timeout=120s
                '''
            }
        }

        // ─── 10. HEALTH CHECK ───────────────────────────────────────────────
        stage('Health Check') {
            steps {
                echo '── Verifying services ──'
                sh '''
                    sleep 15
                    BASE="https://dev.pms.upda.co.in"
                    FAILED=0

                    curl -sf ${BASE}/api/v1/auth/me          && echo "auth-service OK"          || { echo "auth-service DOWN";          FAILED=1; }
                    curl -sf ${BASE}/api/v1/workspaces/      && echo "workspace-service OK"     || { echo "workspace-service DOWN";     FAILED=1; }
                    curl -sf ${BASE}/api/v1/projects/        && echo "project-service OK"       || { echo "project-service DOWN";       FAILED=1; }
                    curl -sf ${BASE}/api/v1/tasks/           && echo "task-service OK"          || { echo "task-service DOWN";          FAILED=1; }
                    curl -sf ${BASE}/api/v1/notifications/   && echo "notification-service OK"  || { echo "notification-service DOWN";  FAILED=1; }
                    curl -sf ${BASE}/api/v1/workflows/       && echo "workflow-service OK"      || { echo "workflow-service DOWN";      FAILED=1; }
                    curl -sf ${BASE}/api/v1/chats/           && echo "comms-service OK"         || { echo "comms-service DOWN";         FAILED=1; }
                    curl -sf ${BASE}/api/v1/files/           && echo "file-service OK"          || { echo "file-service DOWN";          FAILED=1; }
                    curl -sf ${BASE}/api/v1/meetings/        && echo "meeting-service OK"       || { echo "meeting-service DOWN";       FAILED=1; }
                    curl -sf ${BASE}/dev                     && echo "API portal OK"            || { echo "API portal DOWN";            FAILED=1; }

                    [ $FAILED -eq 0 ] || { echo "One or more services failed health check"; exit 1; }
                '''
            }
        }
    }

    post {
        success {
            echo """
            Build #${BUILD_NUMBER} deployed successfully
            API: https://dev.pms.upda.co.in
            Docs: https://dev.pms.upda.co.in/dev
            """
        }
        failure {
            echo "Build #${BUILD_NUMBER} failed — check console output above"
            sh 'kubectl get pods -n pms || true'
        }
        always {
            // Clean up injected .env files before workspace wipe
            sh 'rm -f ${PROJECT_DIR}/.env ${PROJECT_DIR}/services/*/.env || true'
            cleanWs()
        }
    }
}
