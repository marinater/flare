
#!/bin/bash

if [ "${NODE_ENV}" = "production" ]; then
    npm start
else
    ./wait-for-it.sh db:5432 -- npm start
fi
