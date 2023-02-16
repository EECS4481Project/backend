# pull nodejs img
FROM node:alpine

# create directory for src
WORKDIR /usr/src/backend

# copy src to container
COPY . .

# install dependencies
RUN npm install --production

# set env vars
ENV PORT=80
ENV NODE_ENV=production

# expose port
EXPOSE 80

# start app
CMD ["npm", "run", "start"]