pipeline {
    agent any

    parameters {
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip unit/integration tests')
        booleanParam(name: 'SKIP_MIGRATIONS', defaultValue: false, description: 'Skip Prisma migrate deploy (DB migrations)')
        booleanParam(name: 'SKIP_ROLLOUT_WAIT', defaultValue: false, description: 'Skip waiting for Kubernetes rollout status')
        booleanParam(name: 'SKIP_HEALTH_CHECK', defaultValue: false, description: 'Skip post-deploy health checks')
    }

    environment {
        PROJECT_DIR  = "${WORKSPACE}/build"
        NVM_DIR      = '/home/jenkins/.nvm'
        NODE_VERSION = '20'
        REGISTRY     = '192.168.1.226:5000'
        IMAGE_TAG    = "${BUILD_NUMBER}"
        NAMESPACE    = 'pms'
        KUBECONFIG   = '/home/jenkins/.kube/config'
        KUBECTL      = '/usr/local/bin/k3s kubectl'
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
                // Unified env: ONE root .env shared by all backend services
                // (per-service PORT/DB_NAME are fixed in each service's index.js),
                // plus the frontend's .env.local.
                withCredentials([
                    file(credentialsId: 'pms-root-env',     variable: 'ROOT_ENV'),
                    file(credentialsId: 'pms-frontend-env', variable: 'FRONTEND_ENV')
                ]) {
                    sh '''
                        cp "$ROOT_ENV"     ${PROJECT_DIR}/.env
                        cp "$FRONTEND_ENV" ${PROJECT_DIR}/services/frontend/.env.local
                        echo "Unified root .env + frontend .env.local injected."
                    '''
                }
            }
        }

        // ─── 3. INSTALL DEPENDENCIES (incremental, cached) ──────────────────
        // Reuse a persistent node_modules cache that survives cleanWs(), and only
        // reinstall when package-lock.json actually changed — big time saver, with
        // guard-rails so we don't ship a stale tree. A nightly job should force a
        // clean rebuild (touch ${NM_CACHE}/.force-clean) to flush any drift.
        stage('Install') {
            environment {
                NM_CACHE = '/home/jenkins/pms-cache/node_modules'
                LOCK_HASH = '/home/jenkins/pms-cache/package-lock.sha256'
            }
            steps {
                echo '── Installing npm packages (incremental) ──'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION}
                    mkdir -p "$(dirname ${NM_CACHE})"
                    cd ${PROJECT_DIR}

                    # Warm the workspace from cache if present.
                    if [ -d "${NM_CACHE}" ]; then
                        echo "Restoring node_modules from cache…"
                        cp -a "${NM_CACHE}" ./node_modules
                    fi

                    NEW_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
                    OLD_HASH="$(cat ${LOCK_HASH} 2>/dev/null || echo none)"

                    if [ ! -d node_modules ] || [ "${NEW_HASH}" != "${OLD_HASH}" ] || [ -f "${NM_CACHE}/../.force-clean" ]; then
                        echo "Lockfile changed (or forced) → npm install"
                        npm install
                        echo "${NEW_HASH}" > ${LOCK_HASH}
                        rm -rf "${NM_CACHE}" && cp -a ./node_modules "${NM_CACHE}"
                        rm -f "${NM_CACHE}/../.force-clean" || true
                    else
                        echo "Lockfile unchanged → skipping npm install (cache hit)"
                    fi
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
            when {
                expression { !params.SKIP_TESTS }
            }
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
                    docker build -f services/comment-service/Dockerfile      -t ${REGISTRY}/pms-comment:${IMAGE_TAG}      -t ${REGISTRY}/pms-comment:latest      .
                    docker build -f services/frontend/Dockerfile             -t ${REGISTRY}/pms-frontend:${IMAGE_TAG}     -t ${REGISTRY}/pms-frontend:latest     .
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
                    docker push ${REGISTRY}/pms-comment:${IMAGE_TAG}      && docker push ${REGISTRY}/pms-comment:latest
                    docker push ${REGISTRY}/pms-frontend:${IMAGE_TAG}     && docker push ${REGISTRY}/pms-frontend:latest
                '''
            }
        }

        // ─── 8. RUN DB MIGRATIONS ───────────────────────────────────────────
        stage('Migrate DB') {
            when {
                expression { !params.SKIP_MIGRATIONS }
            }
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
                    ${KUBECTL} -n kube-system patch svc traefik --type='json' -p='[
                      {"op":"replace","path":"/spec/type","value":"NodePort"},
                      {"op":"replace","path":"/spec/ports/0/nodePort","value":32080},
                      {"op":"replace","path":"/spec/ports/1/nodePort","value":32443}
                    ]' || true

                    # Update image tags in manifests
                    sed -i "s|YOUR_REGISTRY|${REGISTRY}|g" ${PROJECT_DIR}/k8s/services.yaml
                    sed -i "s|:latest|:${IMAGE_TAG}|g"     ${PROJECT_DIR}/k8s/services.yaml

                    # Apply manifests
                    ${KUBECTL} apply -f ${PROJECT_DIR}/k8s/namespace-and-secrets.yaml
                    ${KUBECTL} apply -f ${PROJECT_DIR}/k8s/services.yaml
                    ${KUBECTL} apply -f ${PROJECT_DIR}/k8s/ingress.yaml

                    if [ "${SKIP_ROLLOUT_WAIT}" != "true" ]; then
                      ${KUBECTL} rollout status deployment/pms-auth         -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-workspace     -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-project       -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-task          -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-notification  -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-workflow      -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-comms         -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-files         -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-meeting       -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-comment       -n ${NAMESPACE} --timeout=120s
                      ${KUBECTL} rollout status deployment/pms-frontend      -n ${NAMESPACE} --timeout=120s
                    fi
                '''
            }
        }

        // ─── 10. HEALTH CHECK ───────────────────────────────────────────────
        stage('Health Check') {
            when {
                expression { !params.SKIP_HEALTH_CHECK }
            }
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
                    curl -sf ${BASE}/api/v1/comments/        && echo "comment-service OK"       || { echo "comment-service DOWN";       FAILED=1; }
                    curl -sf ${BASE}/                        && echo "frontend OK"              || { echo "frontend DOWN";              FAILED=1; }
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
            sh '${KUBECTL} get pods -n pms || true'
        }
        always {
            // Clean up injected secrets before workspace wipe (unified root .env +
            // frontend .env.local). The persistent node_modules cache at
            // /home/jenkins/pms-cache survives cleanWs() and is reused next build.
            sh 'rm -f ${PROJECT_DIR}/.env ${PROJECT_DIR}/services/frontend/.env.local || true'
            cleanWs()
        }
    }
}
