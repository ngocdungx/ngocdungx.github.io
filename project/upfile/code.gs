// --- CẤU HÌNH ---
// Hãy thay ID thư mục Google Drive của bạn vào bên dưới
const FOLDER_ID = "1lcMKQowuPbw35y9Rz_RaJ8T7y1Abz0AH"; 

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
      
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: dlUrl,
        size: (file.getSize() / 1024 / 1024).toFixed(2) + " MB",
        date: file.getDateCreated().toLocaleString(),
        isTrashed: file.isTrashed()
      });
    }
    // Sắp xếp mới nhất lên đầu
    return fileList.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
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
