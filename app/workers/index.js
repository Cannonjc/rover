let runningJobs = [];
module.exports = {
    execute: function () {
      let jobs = ['rover'];
      for (let i in jobs) {
        let cron = require('./' + jobs[i]);
        let job = cron.run();
        if (job) {
          job.start();
          runningJobs.push(job);
        }
      }
    },
    stop: function () {
      for (let i in runningJobs) {
          jobs[i].stop();
      }
    }
}
