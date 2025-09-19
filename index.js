/* 방별 데이터 저장 */
let roomData = {};

/* 전역 잭팟 설정 (모든 방 공통) */
let globalJackpotConfig = {
  enabled: true,          // 잭팟 활성화 여부
  probability: 0.03,      // 잭팟 확률 (1% = 0.01)
  minReward: 10,          // 최소 보상
  maxReward: 50,         // 최대 보상
  cooldown: 10             // 잭팟 쿨다운 (분)
};

/* 저장 시스템 */
let saveTimers = {}; // 방별 저장 타이머

// 방별 데이터 초기화 및 반환 함수
function getRoomData(room) {
  if (!roomData[room]) {
    roomData[room] = {
      users: {},
      admins: [],
      dailyStats: {},
      currentDate: new Date().toISOString().slice(0, 10),
      mvpTimer: null,
      mvpTimerStarted: false,
      lastJackpotTime: 0
    };
  }
  return roomData[room];
}

/* 상점 아이템 */
let shopItems = {
  "닉네임 지정권": { price: 1000, effect: "원하는 닉네임으로 변경 또는 지정권(수위 지키기)" },
  "집 앞벙 집합 개최권": { price: 1500, effect: "(보완 필요)" },
  "야자타임권": { price: 800, effect: "1시간동안 야자타임 시작" }
};

/* 데이터 저장/로드 함수 */
function saveRoomData(room, priority = 'normal') {
  if (priority === 'critical') {
    // 중요 명령어는 즉시 저장
    saveRoomDataImmediate(room);
  } else {
    // 일반 명령어는 1초 지연 저장 (기존 타이머 취소)
    if (saveTimers[room]) {
      clearTimeout(saveTimers[room]);
    }
    saveTimers[room] = setTimeout(function() {
      saveRoomDataImmediate(room);
      delete saveTimers[room];
    }, 1000);
  }
}

function saveRoomDataImmediate(room) {
  try {
    let data = roomData[room];
    if (data) {
      DataBase.setDataBase("room_" + room + "_users", JSON.stringify(data.users));
      DataBase.setDataBase("room_" + room + "_admins", JSON.stringify(data.admins));
      DataBase.setDataBase("room_" + room + "_dailyStats", JSON.stringify(data.dailyStats));
      DataBase.setDataBase("room_" + room + "_currentDate", data.currentDate);
      DataBase.setDataBase("room_" + room + "_mvpTimerStarted", data.mvpTimerStarted.toString());
      DataBase.setDataBase("room_" + room + "_lastJackpotTime", data.lastJackpotTime.toString());
    }
  } catch (e) {
    console.error("데이터 저장 오류:", e);
  }
}

function loadRoomData(room) {
  try {
    let data = getRoomData(room);
    
    let users = DataBase.getDataBase("room_" + room + "_users");
    if (users) {
      data.users = JSON.parse(users);
    }
    
    let admins = DataBase.getDataBase("room_" + room + "_admins");
    if (admins) {
      data.admins = JSON.parse(admins);
    }
    
    let dailyStats = DataBase.getDataBase("room_" + room + "_dailyStats");
    if (dailyStats) {
      data.dailyStats = JSON.parse(dailyStats);
    }
    
    let currentDate = DataBase.getDataBase("room_" + room + "_currentDate");
    if (currentDate) {
      data.currentDate = currentDate;
    }
    
    let mvpTimerStarted = DataBase.getDataBase("room_" + room + "_mvpTimerStarted");
    if (mvpTimerStarted) {
      data.mvpTimerStarted = mvpTimerStarted === "true";
    }
    
    let lastJackpotTime = DataBase.getDataBase("room_" + room + "_lastJackpotTime");
    if (lastJackpotTime) {
      data.lastJackpotTime = parseInt(lastJackpotTime);
    }
  } catch (e) {
    console.error("데이터 로드 오류:", e);
  }
}

function saveGlobalData() {
  try {
    DataBase.setDataBase("globalJackpotConfig", JSON.stringify(globalJackpotConfig));
    DataBase.setDataBase("roomDataList", JSON.stringify(Object.keys(roomData)));
  } catch (e) {
    console.error("전역 데이터 저장 오류:", e);
  }
}

function loadGlobalData() {
  try {
    let jackpotData = DataBase.getDataBase("globalJackpotConfig");
    if (jackpotData) {
      globalJackpotConfig = JSON.parse(jackpotData);
    }
    
    let roomList = DataBase.getDataBase("roomDataList");
    if (roomList) {
      let rooms = JSON.parse(roomList);
      for (let i = 0; i < rooms.length; i++) {
        loadRoomData(rooms[i]);
      }
    }
  } catch (e) {
    console.error("전역 데이터 로드 오류:", e);
  }
}

// 봇 시작 시 데이터 로드
loadGlobalData();

// 관리자 확인 함수 (방별)
function isAdmin(room, username) {
  let data = getRoomData(room);
  return data.admins.includes(username);
}

// 일일 통계 초기화 확인 (방별)
function checkDayReset(room) {
  let data = getRoomData(room);
  let today = new Date().toISOString().slice(0, 10);
  if (data.currentDate !== today) {
    // 새로운 날이면 일일 통계 초기화
    data.dailyStats = {};
    data.currentDate = today;
    saveRoomData(room);
  }
}

// 일일 통계 업데이트 (방별)
function updateDailyStats(room, username, chatCount, pointsGained) {
  // 기본값 설정 (구버전 JavaScript 호환)
  if (chatCount === undefined) chatCount = 0;
  if (pointsGained === undefined) pointsGained = 0;
  
  let data = getRoomData(room);
  if (!data.dailyStats[username]) {
    data.dailyStats[username] = {
      chatCount: 0,
      pointsGained: 0
    };
  }
  
  data.dailyStats[username].chatCount += chatCount;
  data.dailyStats[username].pointsGained += pointsGained;
}

// MVP 발표 함수 (방별)
function announceMVP(room, replier) {
  checkDayReset(room);
  let data = getRoomData(room);
  
  if (Object.keys(data.dailyStats).length === 0) {
    replier.reply("🏆 오늘의 MVP\n\n아직 오늘 활동한 유저가 없습니다!");
    return;
  }
  
  // 포인트 + 채팅수로 종합 점수 계산 (포인트 가중치 더 높게)
  let userList = [];
  for (let username in data.dailyStats) {
    let stats = data.dailyStats[username];
    let totalScore = stats.pointsGained * 2 + stats.chatCount; // 포인트에 2배 가중치
    userList.push([username, stats, totalScore]);
  }
  
  userList.sort(function(a, b) { return b[2] - a[2]; }); // 종합 점수 순 정렬
  
  let mvpMessage = "🏆 오늘의 MVP TOP " + Math.min(20, userList.length) + " 🏆\n\n";
  
  for (let i = 0; i < Math.min(20, userList.length); i++) {
    let rank = i + 1;
    let username = userList[i][0];
    let stats = userList[i][1];
    let medal = "";
    
    if (rank === 1) medal = "🥇";
    else if (rank === 2) medal = "🥈";
    else if (rank === 3) medal = "🥉";
    else medal = rank + "위";
    
    mvpMessage += medal + " " + username + "\n" +
                  "  💬 채팅: " + stats.chatCount + "회 | 💎 포인트: " + stats.pointsGained + "P\n\n";
  }
  
  mvpMessage += "⏰ " + new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'}) + " 기준";
  
  replier.reply(mvpMessage);
}

// MVP 타이머 시작 (방별)
function startMVPTimer(room, replier) {
  let data = getRoomData(room);
  
  // 이미 시작된 타이머가 있으면 실행 안함
  if (data.mvpTimerStarted) {
    return;
  }
  
  // 기존 타이머들 모두 정리
  clearAllMVPTimers(room);
  
  // 타이머 시작 플래그 설정
  data.mvpTimerStarted = true;
  
  // === 테스트용: 1분마다 MVP 발표 ===
//   data.mvpTimer = setInterval(function() {
//     announceMVP(room, replier);
//   }, 60000); // 1분 = 60000ms
  
  // === 실제 운영용: 정각마다 MVP 발표 ===
  
  // 현재 시간 정보 가져오기
  let now = new Date();
  let currentMinutes = now.getMinutes();
  let currentSeconds = now.getSeconds();
  let currentMilliseconds = now.getMilliseconds();
  
  // 다음 정각까지 남은 시간 계산 (밀리초)
  let msUntilNextHour = (60 - currentMinutes - 1) * 60 * 1000 + 
                        (60 - currentSeconds) * 1000 + 
                        (1000 - currentMilliseconds);
  
  // 첫 번째 정각 발표를 위한 타이머
  data.mvpTimer = setTimeout(function() {
    announceMVP(room, replier);
    
    // 이후 매시간 정각마다 발표하는 인터벌 타이머
    data.mvpTimer = setInterval(function() {
      announceMVP(room, replier);
    }, 3600000); // 1시간 = 3600000ms
    
  }, msUntilNextHour);
}

// 모든 MVP 타이머 정리 (방별)
function clearAllMVPTimers(room) {
  let data = getRoomData(room);
  if (data.mvpTimer) {
    clearInterval(data.mvpTimer);
    clearTimeout(data.mvpTimer);
    data.mvpTimer = null;
  }
  data.mvpTimerStarted = false;
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  
  // 방별 데이터 초기화 및 로드 (처음에만)
  let data = getRoomData(room);
  if (!data.initialized) {
    loadRoomData(room);
    data = getRoomData(room);
    data.initialized = true;
  }
  
  // 일일 통계 초기화 확인
  checkDayReset(room);
  
  // MVP 타이머 시작 (처음 한 번만)
  if (!data.mvpTimerStarted) {
    startMVPTimer(room, replier);
  }
  
  // 스팸 방지: 너무 빠른 연속 명령어 차단
  let now = Date.now();
  if (!data.users[sender]) {
    data.users[sender] = { 
      exp: 0, 
      level: 1, 
      point: 0, 
      lastCheck: "", 
      items: [],
      lastCommand: 0,
      chatCount: 0
    };
  }
  
  // 스팸 방지 (1초 이내 명령어 차단)
  if (msg.startsWith("!") && now - data.users[sender].lastCommand < 1000) {
    replier.reply("⚠️ 너무 빨라요! 1초 후에 다시 시도해주세요.");
    return;
  }
  
  if (msg.startsWith("!")) {
    data.users[sender].lastCommand = now;
  }
  
  // 일반 채팅 시에만 경험치 획득 (명령어 제외)
  if (!msg.startsWith("!")) {
    data.users[sender].chatCount++;
    
    // 디버깅용 로그 (실제 운영시에는 제거 가능)
    // replier.reply("🔍 " + sender + "님 채팅수: " + data.users[sender].chatCount + "회");
    
    // 일일 통계 업데이트 (채팅수)
    updateDailyStats(room, sender, 1, 0);
    
    let jackpotTriggered = false;
    let levelUpTriggered = false;
    
    // 잭팟 확률 체크 (채팅할 때마다)
    if (globalJackpotConfig.enabled && Math.random() < globalJackpotConfig.probability) {
      let currentTime = Date.now();
      // 쿨다운 체크 (분 단위)
      if (currentTime - data.lastJackpotTime >= globalJackpotConfig.cooldown * 60 * 1000) {
        let jackpotAmount = Math.floor(Math.random() * (globalJackpotConfig.maxReward - globalJackpotConfig.minReward + 1)) + globalJackpotConfig.minReward;
        data.users[sender].point += jackpotAmount;
        data.lastJackpotTime = currentTime;
        
        // 일일 통계 업데이트 (잭팟 포인트)
        updateDailyStats(room, sender, 0, jackpotAmount);
        
        replier.reply("🎰💰 잭팟! 🎰💰\n" +
                      "🎊 " + sender + "님 축하합니다! 🎊\n" +
                      "💎 " + jackpotAmount + "포인트 대박! 💎\n" +
                      "✨ 행운이 함께하네요! ✨");
        jackpotTriggered = true;
      }
    }
    
    // 5번 채팅할 때마다 경험치 +1 (스팸 방지)
    if (data.users[sender].chatCount % 5 === 0) {
      data.users[sender].exp += 1;
      
      // 레벨업 조건 (50 * 현재 레벨)
      let requiredExp = data.users[sender].level * 50;
      if (data.users[sender].exp >= requiredExp) {
        data.users[sender].level += 1;
        data.users[sender].point += 10; // 레벨업 보상 포인트
        
        // 일일 통계 업데이트 (레벨업 보상 포인트)
        updateDailyStats(room, sender, 0, 10);
        
        // 잭팟과 레벨업이 동시에 일어나지 않았을 때만 레벨업 메시지
        if (!jackpotTriggered) {
          replier.reply("🎉 " + sender + "님 레벨업!\n현재 레벨: " + data.users[sender].level + "\n보너스 포인트 +10 획득!");
        }
        levelUpTriggered = true;
      }
    }
    
    // 데이터 저장 (잭팟 터졌거나, 레벨업했거나, 5번 채팅마다)
    if (jackpotTriggered || levelUpTriggered) {
      saveRoomData(room, 'critical'); // 잭팟/레벨업은 즉시 저장
    } else if (data.users[sender].chatCount % 5 === 0) {
      saveRoomData(room, 'normal'); // 일반 채팅은 1초 지연 저장
    }
    
    return; // 일반 채팅은 여기서 종료
  }
  
  // === 도움말 ===
    if (msg === "!도움말" || msg === "!명령어") {
    replier.reply(
      "🤖 봇 명령어 목록\n\n" +
      "!출석 - 일일 출석체크\n" +
      "!내정보 - 내 정보 확인\n" +
      "!랭킹 - 경험치 랭킹 TOP5\n" +
      "!mvp - 오늘의 MVP TOP20 확인\n" +
      "!상점 - 아이템 상점 보기\n" +
      "!구매 [아이템명] - 아이템 구매\n" +
      "!양도 [닉네임] [포인트] - 다른 유저에게 포인트 양도\n"
    );
  }
  
  // === 출석 체크 ===
  else if (msg === "!출석") {
    let today = new Date().toISOString().slice(0, 10);
    if (data.users[sender].lastCheck === today) {
      replier.reply(sender + "님, 이미 오늘 출석 완료! ✅\n내일 또 만나요 😊");
    } else {
      data.users[sender].lastCheck = today;
      data.users[sender].point += 2;   // 출석 보상 포인트
      data.users[sender].exp += 10;    // 경험치 보너스
      
      // 일일 통계 업데이트 (출석 보상 포인트)
      updateDailyStats(room, sender, 0, 2);
      
      // 연속 출석 체크 (추후 확장 가능)
      replier.reply("✅ " + sender + "님 출석 완료!\n💎 경험치 +10, 포인트 +2 획득!");
      saveRoomData(room, 'critical'); // 출석은 즉시 저장
    }
  }
  
  // === 내정보 ===
  else if (msg === "!내정보") {
    let nextLevelExp = data.users[sender].level * 50;
    let progress = Math.floor((data.users[sender].exp / nextLevelExp) * 100);
    
    let itemsText = "없음";
    if (data.users[sender].items.length > 0) {
      itemsText = data.users[sender].items.join(", ");
    }
    
    // 일일 통계 정보도 함께 표시
    let dailyInfo = "";
    if (data.dailyStats[sender]) {
      dailyInfo = "\n🌅 오늘 채팅: " + data.dailyStats[sender].chatCount + "회" +
                  "\n🌅 오늘 포인트: " + data.dailyStats[sender].pointsGained + "P";
    } else {
      dailyInfo = "\n🌅 오늘 활동: 없음";
    }
    
    // 디버깅 정보 추가
    let debugInfo = "\n🔧 디버그: 데이터 초기화됨=" + (data.initialized ? "예" : "아니오");
    
    replier.reply(
      "📌 " + sender + "님의 정보 (" + room + " 방)\n\n" +
      "🏆 레벨: " + data.users[sender].level + "\n" +
      "⚡ 경험치: " + data.users[sender].exp + "/" + nextLevelExp + " (" + progress + "%)\n" +
      "💎 포인트: " + data.users[sender].point + "\n" +
      "🎒 보유 아이템: " + itemsText + "\n" +
      "💬 총 채팅 수: " + data.users[sender].chatCount + dailyInfo 
    );
  }
  
  // === 랭킹 ===
  else if (msg === "!랭킹") {
    let userList = [];
    for (let name in data.users) {
      userList.push([name, data.users[name]]);
    }
    
    if (userList.length === 0) {
      replier.reply("아직 랭킹 데이터가 없어요!");
      return;
    }
    
    userList.sort(function(a, b) { return b[1].exp - a[1].exp; });
    
    let ranking = "";
    for (let i = 0; i < Math.min(5, userList.length); i++) {
      let rank = i + 1;
      let name = userList[i][0];
      let userData = userList[i][1];
      ranking += rank + "등: " + name + " (Lv." + userData.level + " / " + userData.exp + "exp / 채팅:" + userData.chatCount + "회)\n";
    }
    
    replier.reply("📊 " + room + " 방 경험치 랭킹 TOP5\n\n" + ranking);
  }
  
  // === 채팅수 확인 ===
  else if (msg === "!채팅수") {
    let dailyChatCount = data.dailyStats[sender] ? data.dailyStats[sender].chatCount : 0;
    replier.reply("💬 " + sender + "님의 채팅 정보\n" +
                  "📊 총 채팅 수: " + data.users[sender].chatCount + "회\n" +
                  "🌅 오늘 채팅: " + dailyChatCount + "회\n");
  }
  
  // === 오늘의 MVP ===
  else if (msg === "!mvp" || msg === "!MVP") {
    announceMVP(room, replier);
  }
  
  // === 상점 ===
  else if (msg === "!상점") {
    let itemList = "";
    for (let itemName in shopItems) {
      let item = shopItems[itemName];
      itemList += itemName + " - " + item.price + "P\n  └ " + item.effect + "\n\n";
    }
    replier.reply("🛒 아이템 상점\n\n" + itemList + "💡 !구매 [아이템명] 으로 구매하세요!");
  }
  
  // === 구매 ===
  else if (msg.startsWith("!구매 ")) {
    // "!구매 " 이후의 모든 텍스트를 아이템명으로 처리 (띄어쓰기 포함)
    let parts = msg.split(" ");
    if (parts.length < 2) {
      replier.reply("❌ 사용법: !구매 [아이템명]\n예시: !구매 닉네임 변경권");
      return;
    }
    // 첫 번째 부분("!구매")을 제외하고 나머지를 모두 합쳐서 아이템명으로 사용
    let itemName = parts.slice(1).join(" ").trim();
    
    let item = shopItems[itemName];
    if (!item) {
      replier.reply("❌ '" + itemName + "' 아이템을 찾을 수 없어요!\n!상점 명령어로 목록을 확인해주세요.");
      return;
    }
    
    if (data.users[sender].point < item.price) {
      replier.reply("💎 포인트가 부족해요!\n필요: " + item.price + "P / 보유: " + data.users[sender].point + "P");
      return;
    }
    
    data.users[sender].point -= item.price;
    data.users[sender].items.push(itemName);
    replier.reply("🛍️ '" + itemName + "' 구매 완료!\n💎 포인트 " + item.price + " 차감되었어요.");
    saveRoomData(room, 'critical'); // 구매는 즉시 저장
  }
  
  // === 포인트 양도 ===
  else if (msg.startsWith("!양도 ")) {
    let parts = msg.split(" ");
    if (parts.length < 3) {
      replier.reply("❌ 사용법: !양도 [닉네임] [포인트]");
      return;
    }
    
    let targetUser = parts[1];
    let amount = parseInt(parts[2]);
    
    // 입력값 검증
    if (!amount || amount <= 0) {
      replier.reply("❌ 양도할 포인트는 1 이상의 숫자여야 해요!");
      return;
    }
    
    // 자기 자신에게 양도 방지
    if (targetUser === sender) {
      replier.reply("❌ 자기 자신에게는 포인트를 양도할 수 없어요!");
      return;
    }
    
    // 포인트 부족 확인
    if (data.users[sender].point < amount) {
      replier.reply("💎 포인트가 부족해요!\n필요: " + amount + "P / 보유: " + data.users[sender].point + "P");
      return;
    }
    
    // 받을 사용자가 시스템에 등록되어 있는지 확인
    if (!data.users[targetUser]) {
      data.users[targetUser] = { 
      exp: 0, 
      level: 1, 
      point: 0, 
      lastCheck: "", 
      items: [],
      lastCommand: 0,
      chatCount: 0
    };
    }
    
    // 포인트 양도 실행
    data.users[sender].point -= amount;
    data.users[targetUser].point += amount;
    
    // 일일 통계 업데이트 (받는 사람의 포인트 획득)
    updateDailyStats(room, targetUser, 0, amount);
    
    replier.reply("💸 포인트 양도 완료!\n" + 
                  sender + " → " + targetUser + "\n" +
                  "💎 " + amount + "P 양도됨\n\n" +
                  "💰 " + sender + " 잔액: " + data.users[sender].point + "P\n" +
                  "💰 " + targetUser + " 잔액: " + data.users[targetUser].point + "P");
    saveRoomData(room, 'critical'); // 양도는 즉시 저장
  }
  
  // === 관리자 등록 ===
  else if (msg === "!관리자등록") {
    // 첫 번째 관리자는 누구나 등록 가능
    if (data.admins.length === 0) {
      data.admins.push(sender);
      replier.reply("👑 " + sender + "님이 " + room + " 방의 첫 번째 관리자로 등록되었습니다!");
      saveRoomData(room, 'critical'); // 관리자 등록은 즉시 저장
    } else {
      replier.reply("❌ 이미 관리자가 존재합니다. 기존 관리자만 새로운 관리자를 추가할 수 있어요!");
    }
  }
  
  // === 관리자 명령어 ===
  else if (msg.startsWith("!관리자")) {
    if (!isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 사용할 수 있는 명령어입니다.");
      return;
    }
    
    // 관리자 목록 조회
    if (msg === "!관리자목록") {
      if (data.admins.length === 0) {
        replier.reply("👑 등록된 관리자가 없습니다.\n!관리자등록 명령어로 첫 관리자를 등록하세요!");
      } else {
        let adminList = "👑 " + room + " 방 관리자 목록\n\n";
        for (let i = 0; i < data.admins.length; i++) {
          adminList += (i + 1) + ". " + data.admins[i] + "\n";
        }
        replier.reply(adminList);
      }
    }
    
    // 관리자 추가
    else if (msg.startsWith("!관리자추가 ")) {
      let targetUser = msg.split(" ")[1];
      if (!targetUser) {
        replier.reply("❌ 사용법: !관리자추가 [닉네임]");
        return;
      }
      
      if (isAdmin(room, targetUser)) {
        replier.reply("❌ " + targetUser + "님은 이미 관리자입니다!");
        return;
      }
      
      data.admins.push(targetUser);
      replier.reply("👑 " + targetUser + "님이 " + room + " 방 관리자로 추가되었습니다!");
      saveRoomData(room, 'critical'); // 관리자 추가는 즉시 저장
    }
    
    // 관리자 해제
    else if (msg.startsWith("!관리자해제 ")) {
      let targetUser = msg.split(" ")[1];
      if (!targetUser) {
        replier.reply("❌ 사용법: !관리자해제 [닉네임]");
        return;
      }
      
      if (targetUser === sender) {
        replier.reply("❌ 자기 자신은 해제할 수 없습니다!");
        return;
      }
      
      if (!isAdmin(room, targetUser)) {
        replier.reply("❌ " + targetUser + "님은 관리자가 아닙니다!");
        return;
      }
      
      data.admins = data.admins.filter(admin => admin !== targetUser);
      replier.reply("👑 " + targetUser + "님의 " + room + " 방 관리자 권한이 해제되었습니다!");
      saveRoomData(room, 'critical'); // 관리자 해제는 즉시 저장
    }
    
    // 전체 데이터 초기화
    else if (msg === "!관리자 전체초기화") {
      data.users = {};
      replier.reply("🔄 " + room + " 방 전체 유저 데이터가 초기화되었습니다.");
      saveRoomData(room, 'critical'); // 전체 초기화는 즉시 저장
    }
    
    // 잭팟 설정 보기
    else if (msg === "!잭팟설정") {
      let status = globalJackpotConfig.enabled ? "활성화" : "비활성화";
      let probability = (globalJackpotConfig.probability * 100).toFixed(2);
      replier.reply(
        "🎰 잭팟 설정 (전역)\n\n" +
        "상태: " + status + "\n" +
        "확률: " + probability + "%\n" +
        "보상: " + globalJackpotConfig.minReward + "~" + globalJackpotConfig.maxReward + "P\n" +
        "쿨다운: " + globalJackpotConfig.cooldown + "분"
      );
    }
    
    // 잭팟 활성화/비활성화
    else if (msg.startsWith("!잭팟 ")) {
      let action = msg.split(" ")[1];
      if (action === "켜기") {
        globalJackpotConfig.enabled = true;
        replier.reply("🎰 잭팟이 활성화되었습니다!");
        saveGlobalData();
      } else if (action === "끄기") {
        globalJackpotConfig.enabled = false;
        replier.reply("🎰 잭팟이 비활성화되었습니다!");
        saveGlobalData();
      } else {
        replier.reply("❌ 사용법: !잭팟 켜기 또는 !잭팟 끄기");
      }
    }
    
    // 잭팟 확률 조정
    else if (msg.startsWith("!잭팟확률 ")) {
      let newProbability = parseFloat(msg.split(" ")[1]);
      if (!newProbability || newProbability <= 0 || newProbability > 10) {
        replier.reply("❌ 확률은 0.01~10 사이의 숫자로 입력해주세요! (단위: %)");
        return;
      }
      
      globalJackpotConfig.probability = newProbability / 100;
      replier.reply("🎰 잭팟 확률이 " + newProbability + "%로 설정되었습니다!");
      saveGlobalData();
    }
    
    // 잭팟 보상 조정
    else if (msg.startsWith("!잭팟보상 ")) {
      let parts = msg.split(" ");
      if (parts.length < 3) {
        replier.reply("❌ 사용법: !잭팟보상 [최소] [최대]");
        return;
      }
      
      let minReward = parseInt(parts[1]);
      let maxReward = parseInt(parts[2]);
      
      if (!minReward || !maxReward || minReward <= 0 || maxReward <= minReward) {
        replier.reply("❌ 올바른 숫자를 입력해주세요! (최대 > 최소 > 0)");
        return;
      }
      
      globalJackpotConfig.minReward = minReward;
      globalJackpotConfig.maxReward = maxReward;
      replier.reply("🎰 잭팟 보상이 " + minReward + "~" + maxReward + "P로 설정되었습니다!");
      saveGlobalData();
    }
    
    // 잭팟 쿨다운 조정
    else if (msg.startsWith("!잭팟쿨다운 ")) {
      let newCooldown = parseInt(msg.split(" ")[1]);
      if (!newCooldown || newCooldown <= 0) {
        replier.reply("❌ 쿨다운은 1분 이상의 숫자로 입력해주세요!");
        return;
      }
      
      globalJackpotConfig.cooldown = newCooldown;
      replier.reply("🎰 잭팟 쿨다운이 " + newCooldown + "분으로 설정되었습니다!");
      saveGlobalData();
    }
    
    // 잭팟 설정 초기화
    else if (msg === "!잭팟초기화") {
      globalJackpotConfig = {
        enabled: true,
        probability: 0.01,      // 기본 1%
        minReward: 50,          // 기본 최소 보상
        maxReward: 500,         // 기본 최대 보상
        cooldown: 5             // 기본 쿨다운 5분
      };
      replier.reply("🎰 잭팟 설정이 기본값으로 초기화되었습니다!\n" +
                    "확률: 1% | 보상: 50~500P | 쿨다운: 5분");
      saveGlobalData();
    }
    
    // 관리자 자신의 데이터 초기화
    else if (msg === "!초기화") {
      data.users[sender] = { 
        exp: 0, 
        level: 1, 
        point: 0, 
        lastCheck: "", 
        items: [],
        lastCommand: 0,
        chatCount: 0
      };
      replier.reply("🔄 " + sender + "님(관리자)의 " + room + " 방 데이터가 초기화되었습니다.");
      saveRoomData(room, 'critical'); // 관리자 초기화는 즉시 저장
    }
    
    // 특정 사용자 데이터 초기화
    else if (msg.startsWith("!초기화 ")) {
      let targetUser = msg.split(" ")[1];
      if (!targetUser) {
        replier.reply("❌ 사용법: !초기화 [닉네임]");
        return;
      }
      
      if (!data.users[targetUser]) {
        replier.reply("❌ '" + targetUser + "' 사용자를 찾을 수 없습니다!");
        return;
      }
      
      data.users[targetUser] = { 
        exp: 0, 
        level: 1, 
        point: 0, 
        lastCheck: "", 
        items: [],
        lastCommand: 0,
        chatCount: 0
      };
      
      // 일일 통계에서도 제거
      if (data.dailyStats[targetUser]) {
        delete data.dailyStats[targetUser];
      }
      
      replier.reply("🔄 " + targetUser + "님의 " + room + " 방 데이터가 관리자에 의해 초기화되었습니다.");
      saveRoomData(room, 'critical'); // 사용자 초기화는 즉시 저장
    }
    
     // MVP 타이머 리셋
     else if (msg === "!mvp타이머리셋") {
       clearAllMVPTimers(room);
       replier.reply("🔄 " + room + " 방 MVP 타이머가 리셋되었습니다.\n다음 메시지 때 새로 시작됩니다.");
       saveRoomData(room, 'critical'); // 타이머 리셋은 즉시 저장
     }
     
     // 관리자 도움말
     else if (msg === "!관리자도움말") {
      replier.reply(
        "👑 관리자 전용 명령어\n\n" +
        "📋 기본 관리\n" +
        "!관리자목록 - 관리자 목록 보기\n" +
        "!관리자추가 [닉네임] - 관리자 추가\n" +
        "!관리자해제 [닉네임] - 관리자 해제\n" +
        "!관리자 전체초기화 - 전체 유저 데이터 초기화\n\n" +
        "🔄 데이터 초기화\n" +
        "!초기화 - 관리자 자신의 데이터 초기화\n" +
        "!초기화 [닉네임] - 특정 사용자 데이터 초기화\n" +
        "!잭팟초기화 - 잭팟 설정을 기본값으로 리셋\n" +
        "!mvp타이머리셋 - MVP 타이머 중복 버그 해결\n\n" +
        "🎰 잭팟 관리\n" +
        "!잭팟설정 - 잭팟 설정 보기\n" +
        "!잭팟 켜기/끄기 - 잭팟 활성화/비활성화\n" +
        "!잭팟확률 [%] - 잭팟 확률 조정\n" +
        "!잭팟보상 [최소] [최대] - 잭팟 보상 조정\n" +
        "!잭팟쿨다운 [분] - 잭팟 쿨다운 조정"
      );
    }
  }
}