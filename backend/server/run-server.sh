#!/bin/bash
if [ "$NODE_ENV" = "development" ];
then
    npm install && ./wait-for-it.sh db:5432 -- ./node_modules/.bin/ts-node-dev --respawn src/app.ts;
else
    node ./dist/app.js;
fi
