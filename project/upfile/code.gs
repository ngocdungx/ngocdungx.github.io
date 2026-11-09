// --- CẤU HÌNH ---
// Hãy thay ID thư mục Google Drive của bạn vào bên dưới
const FOLDER_ID = "1lcMKQowuPbw35y9Rz_RaJ8T7y1Abz0AH"; 
// Email nhận thông báo khi có người gửi qua Form liên hệ trang chủ
const NOTIFY_EMAIL = "ngocdung.email@gmail.com"; 

/**
 * Xử lý yêu cầu GET:
 * - ?action=list (hoặc mặc định): Trả về JSON danh sách file cho GitHub Pages
 * - ?action=view: Mở giao diện trực tiếp trên script.google.com (nếu cần)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'list';
    
    // Nếu muốn xem trực tiếp trên script.google.com
    if (action === 'view') {
      return HtmlService.createTemplateFromFile('Index')
          .evaluate()
          .setTitle('Kho Lưu Trữ File Công Cộng')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Mặc định trả về danh sách file dạng JSON (hỗ trợ CORS cho fetch từ GitHub)
    var files = getFilesFromDrive();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: files }))
        .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Xử lý yêu cầu POST từ GitHub Pages:
 * - action = "upload": Tải file lên Drive
 * - action = "delete": Chuyển file vào thùng rác
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không nhận được dữ liệu tải lên" }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === "upload") {
      var res = uploadFiles(body.data, body.name, body.type);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: res }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "delete") {
      var res = deleteFileFromDrive(body.fileId);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: res }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "contact") {
      var res = handleContactForm(body.name, body.email, body.phone, body.subject, body.message);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: res }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Action không hợp lệ: " + action }))
        .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm xử lý upload (Chỉ lưu vào Drive)
function uploadFiles(data, name, type) {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Giải mã file từ base64
    var bytes = Utilities.base64Decode(data.substr(data.indexOf('base64,') + 7));
    var blob = Utilities.newBlob(bytes, type, name);
    
    // Tạo file mới
    var file = folder.createFile(blob);
    
    // Set quyền công khai cho file
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      console.log("Không thể set sharing cho file '" + name + "': " + shareErr.toString());
    }
    
    return "OK";
  } catch (f) {
    throw f.toString();
  }
}

// Hàm lấy danh sách file (Chỉ lấy từ Drive)
function getFilesFromDrive() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFiles();
    var fileList = [];
    
    while (files.hasNext()) {
      var file = files.next();
      var dlUrl = file.getDownloadUrl() || ("https://drive.google.com/uc?export=download&id=" + file.getId());
      var d = file.getDateCreated();
      
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: dlUrl,
        size: (file.getSize() / 1024 / 1024).toFixed(2) + " MB",
        date: Utilities.formatDate(d, "Asia/Ho_Chi_Minh", "HH:mm - dd/MM/yyyy"),
        timestamp: d.getTime(),
        isTrashed: file.isTrashed()
      });
    }
    // Sắp xếp mới nhất lên đầu
    return fileList.sort(function(a, b) {
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  } catch (e) {
    return [];
  }
}

// Hàm xóa file (Xóa trong Drive)
function deleteFileFromDrive(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return "Đã xóa";
  } catch (e) {
    throw e.toString();
  }
}

// --- TÍNH NĂNG TỰ ĐỘNG DỌN DẸP FILE TẠM (CRON JOB HÀNG ĐÊM) ---
// Tự động xóa file cũ hơn số ngày quy định để giải phóng dung lượng Google Drive
const DAYS_TO_KEEP = 14; // Số ngày lưu trữ tối đa cho mỗi file tạm (14 ngày)

/**
 * Hàm quét và xóa các file đã hết hạn lưu trữ tạm
 */
function autoCleanupOldFiles() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFiles();
    var now = new Date().getTime();
    var maxAgeMs = DAYS_TO_KEEP * 24 * 60 * 60 * 1000;
    var deletedCount = 0;

    while (files.hasNext()) {
      var file = files.next();
      var age = now - file.getDateCreated().getTime();
      if (age > maxAgeMs) {
        file.setTrashed(true);
        deletedCount++;
      }
    }
    console.log("Đã dọn dẹp " + deletedCount + " file cũ hơn " + DAYS_TO_KEEP + " ngày.");
    return "Đã dọn dẹp " + deletedCount + " file.";
  } catch (err) {
    console.error("Lỗi dọn dẹp file: " + err.toString());
  }
}

/**
 * HƯỚNG DẪN: Chạy hàm này 1 lần duy nhất trong trình soạn thảo Google Apps Script
 * để hệ thống tự động lên lịch chạy dọn dẹp vào lúc 0h - 1h sáng mỗi ngày.
 */
function setupDailyCleanupTrigger() {
  // Xóa trigger cũ nếu đã tồn tại để tránh trùng lặp
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "autoCleanupOldFiles") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tạo lịch chạy tự động ngầm mỗi ngày vào khoảng 0h - 1h sáng
  ScriptApp.newTrigger("autoCleanupOldFiles")
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();

  console.log("Đã thiết lập lịch tự động dọn dẹp file vào 0h hàng ngày thành công!");
}

// --- TÍNH NĂNG NHẬN TIN NHẮN TỪ FORM LIÊN HỆ TRANG CHỦ & GỬI VỀ GMAIL ---
/**
 * Xử lý thông tin gửi từ Form liên hệ và gửi email thông báo về hộp thư cá nhân
 */
function handleContactForm(name, email, phone, subject, message) {
  name = (name || "Ẩn danh").toString().trim();
  email = (email || "").toString().trim();
  phone = (phone || "Không cung cấp").toString().trim();
  subject = (subject || "Lời nhắn mới từ website ngocdungx.github.io").toString().trim();
  message = (message || "").toString().trim();

  if (!message) {
    throw "Nội dung lời nhắn không được để trống";
  }

  var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM/yyyy");
  var emailSubject = "[Liên Hệ ngocdungx.github.io] " + (subject ? subject : ("Tin nhắn từ " + name));

  var safeMessage = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  var emailHtml = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">'
    + '<div style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 24px; color: #ffffff;">'
    + '<h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff;">📩 Tin Nhắn Liên Hệ Mới</h2>'
    + '<p style="margin: 0; font-size: 13px; opacity: 0.92; color: #ffffff;">Nhận được từ website cá nhân lúc: ' + nowStr + '</p>'
    + '</div>'
    + '<div style="padding: 24px; background-color: #ffffff;">'
    + '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">'
    + '<tr><td style="padding: 10px 0; font-weight: 600; width: 130px; color: #64748b; border-bottom: 1px solid #f1f5f9;">👤 Họ và tên:</td><td style="padding: 10px 0; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">' + name + '</td></tr>'
    + '<tr><td style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9;">📧 Địa chỉ Email:</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;"><a href="mailto:' + email + '" style="color: #4f46e5; text-decoration: none; font-weight: 500;">' + email + '</a></td></tr>'
    + '<tr><td style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9;">📞 Điện thoại / Zalo:</td><td style="padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' + phone + '</td></tr>'
    + '<tr><td style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9;">📌 Chủ đề:</td><td style="padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' + subject + '</td></tr>'
    + '</table>'
    + '<div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-top: 15px;">'
    + '<div style="font-weight: 700; margin-bottom: 8px; color: #334155; font-size: 14px;">💬 Nội dung lời nhắn:</div>'
    + '<p style="margin: 0; white-space: pre-wrap; color: #1e293b; font-size: 14.5px; line-height: 1.7;">' + safeMessage + '</p>'
    + '</div>'
    + '</div>'
    + '<div style="padding: 14px 24px; background-color: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">'
    + 'Hệ thống tự động thông báo từ <b>ngocdungx.github.io</b> • Sử dụng Google Apps Script'
    + '</div>'
    + '</div>';

  var emailText = "Tin nhắn mới từ website ngocdungx.github.io\n"
    + "----------------------------------------\n"
    + "Thời gian: " + nowStr + "\n"
    + "Họ và tên: " + name + "\n"
    + "Email: " + email + "\n"
    + "Điện thoại/Zalo: " + phone + "\n"
    + "Chủ đề: " + subject + "\n\n"
    + "Nội dung:\n" + message + "\n";

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: email || NOTIFY_EMAIL,
    subject: emailSubject,
    htmlBody: emailHtml,
    body: emailText
  });

  return "Tin nhắn của bạn đã được gửi thành công đến Gmail của admin!";
}


