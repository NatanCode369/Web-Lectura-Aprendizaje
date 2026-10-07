import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "src/pages/auth/login.html"),
        register: resolve(__dirname, "src/pages/auth/register.html"),
        forgotPassword: resolve(__dirname, "src/pages/auth/forgot-password.html"),
        catalog: resolve(__dirname, "src/pages/student/catalog/catalog.html"),
        readingDetail: resolve(__dirname, "src/pages/student/reading-detail/reading-detail.html"),
        readingActivity: resolve(__dirname, "src/pages/student/reading-activity/reading-activity.html"),
        myTasks: resolve(__dirname, "src/pages/student/my-tasks/my-tasks.html"),
        myProgress: resolve(__dirname, "src/pages/student/my-progress/my-progress.html"),
        feedback: resolve(__dirname, "src/pages/student/feedback/feedback.html"),
        userProfile: resolve(__dirname, "src/pages/student/user-profile/user-profile.html"),
        activitiesDetectiveWords: resolve(__dirname, "src/pages/student/activities/detective-words.html"),
        activitiesMatching: resolve(__dirname, "src/pages/student/activities/matching.html"),
        activitiesMultipleChoice: resolve(__dirname, "src/pages/student/activities/multiple-choice.html"),
        activitiesOrdering: resolve(__dirname, "src/pages/student/activities/ordering.html"),
        activitiesShortAnswer: resolve(__dirname, "src/pages/student/activities/short-answer.html"),
        activitiesTrueFalse: resolve(__dirname, "src/pages/student/activities/true-false.html"),
        dashboardTeacher: resolve(__dirname, "src/pages/teacher/dashboard-teacher.html"),
        readingNew: resolve(__dirname, "src/pages/teacher/reading-new.html"),
        readingEdit: resolve(__dirname, "src/pages/teacher/reading-edit.html"),
        activitiesEdit: resolve(__dirname, "src/pages/teacher/activities-edit.html"),
        groups: resolve(__dirname, "src/pages/teacher/groups.html"),
        stats: resolve(__dirname, "src/pages/teacher/stats.html"),
      },
    },
  },
});