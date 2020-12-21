
if [ -z "${CONTAINER_DATABASE_URL}"]; then
    export DATABASEURL=${CONTAINER_DATABASE_URL}
fi

if [[ "${NODE_ENV}" == "production" ]]; then
    BASE_URL="https://discord-flare.herokuapp.com"
    npm start
else
    ./wait-for-it.sh db:5432 -- npm start
fi
