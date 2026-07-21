require("dotenv").config();
const { startKakaoServer } = require("./src/kakao/server");

startKakaoServer();
require("./src/bot");
