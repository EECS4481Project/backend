# pull nodejs img
FROM node:alpine

# create directory for src
WORKDIR /usr/src/backend

# copy src to container
COPY . .

# install dependencies
RUN npm install

# set env vars
ENV PORT=3000
ENV NODE_ENV=production

# expose port
EXPOSE 3000

# start app
CMD ["npm", "run", "start"]