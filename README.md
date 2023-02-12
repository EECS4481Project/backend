## Getting Started
1. Install [NodeJS](https://nodejs.org/en/download/)
2. Install [MongoDB](https://www.mongodb.com/docs/manual/installation/)
   - You should make sure MongoDB is successfully running before proceeding.
3. In main directory:
     - Run `$ npm install` to download all dependencies (you'll likely want to do this every time you pull changes).


## Running The Service
1. Run `$ nodemon` in the main directory to run the application (it will hot-reload upon file saves).
2. Then you can make HTTP requests to `localhost:3000` -- the port is defined in `.env`
     - If you haven't done this before, using a tool like [Insomnia](https://insomnia.rest) is useful.


## Running tests
1. Run `$ npm test` in the main directory
     - Note: We're using the [jest](https://jestjs.io) testing framework. For HTTP requests, [supertest](https://www.npmjs.com/package/supertest) is already a dependency if you want to use it.


## Project Structure
- The `prod` branch will be automatically deployed to prod.
- So, it's best if you make a branch for your work, and then make a pull request
to the `prod` branch once your feature is done.


## File Structure
- `/src/main.js` is our main entry point.
- `/src/.env` is our dev env file. Variables here can be accessed in JS via `process.env.VAR_NAME`.
- `/tst/*.test.js` are test files that correspond with a given src file.
- The subdirectories with `/src` are specific features.


### Node Specific files:
- `/src/package.json` is where our dependencies are located
  - You should use [`npm` commands](https://devhints.io/npm) to add/remove
  dependencies rather than manually modifying it. 
- `/src/node_modules` is where our dependencies are stored. You shouldn't commit this folder


## Git cheat sheet incase you're new to git:
- Getting started:
  - Download the repo: `$ git clone https://github.com/EECS4481Project/backend.git`
  - Track the origin: `$ git remote add origin https://github.com/EECS4481Project/backend.git`
  - Create & checkout a new branch `$ git checkout -b BRANCH_NAME`
- Syncing from remote (if working on the same branch as someone else):
  - `git pull origin BRANCH_NAME` to pull any changes in the repo to your local workspace.
  - In case of a merge conflict:
    - The easiest way to handle this is probably via [VSCode](https://stackoverflow.com/a/44682439)
    - Otherwise, you'll have to manually fix all the merge conflicts
- Making changes to the remote branch:
  - `git add some_file some_other_file etc` to add the file to your commit
  - `git commit -m "your_commit_msg"` to create the commit
  - `git push origin BRANCH_NAME` to push your changes to the remote branch
- Pushing changes to prod:
  - Using the GitHub UI, make a pull request to merge your changes to the `prod` branch.
  Then other team members can review your code and merge the changes.