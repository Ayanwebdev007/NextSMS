module.exports = {
  apps : [
    {
      name   : "nextsms-api",
      script : "./app.js",
      env_production: {
         NODE_ENV: "production"
      }
    }, 
    {
      name   : "nextsms-worker",
      script : "./worker.js",
      env_production: {
         NODE_ENV: "production"
      }
    }
  ]
}