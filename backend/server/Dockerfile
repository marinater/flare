FROM node:15
WORKDIR /server
COPY . .
RUN NODE_ENV=development npm install
RUN ./node_modules/.bin/tsc
CMD [ "./run-server.sh" ]
