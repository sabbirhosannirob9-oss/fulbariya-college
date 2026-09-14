/* =========================================================
   NOTICE MANAGEMENT - CLOUDINARY + SUPABASE
   Cloud Name: awxusvtg
   Preset: college_unsigned
   ========================================================= */

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/awxusvtg/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "college_unsigned";

const noticeForm = document.querySelector("#noticeForm");
const noticeList = document.querySelector("#noticeList");
const submitBtn = document.querySelector("#submitBtn");
const messageBox = document.querySelector("#message");

// Cloudinary Upload Function
async function uploadToCloudinary(file){
  if(!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "fulbariya-college"); // Asset Folder

  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  return data.secure_url;
}

// 1. Notice Form Submit
if(noticeForm){
  noticeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Upload হচ্ছে...";
    messageBox.textContent = "";

    const title = document.querySelector("#title").value;
    const details = document.querySelector("#details").value;
    const notice_date = document.querySelector("#notice_date").value;
    const category = document.querySelector("#category").value;
    const is_pinned = document.querySelector("#is_pinned").checked;
    const imageFile = document.querySelector("#image").files[0];
    const pdfFile = document.querySelector("#pdf").files[0];

    try {
      const image_url = await uploadToCloudinary(imageFile);
      const file_url = await uploadToCloudinary(pdfFile);

      const { error } = await window.FDC_SUPABASE
    .from("notices")
    .insert([{ title, details, notice_date, category, is_pinned, image_url, file_url }]);

      if(error) throw error;

      messageBox.className = "success";
      messageBox.textContent = "নোটিশ সফলভাবে Upload হয়েছে ✅";
      noticeForm.reset();
      loadNotices();

    } catch (err) {
      messageBox.className = "error";
      messageBox.textContent = "Error: " + err.message;
    }
    submitBtn.disabled = false;
    submitBtn.textContent = "নোটিশ প্রকাশ করুন";
  });
}

// 2. Load All Notices
async function loadNotices() {
  if(!noticeList) return;
  noticeList.innerHTML = "লোড হচ্ছে...";

  const { data, error } = await window.FDC_SUPABASE
.from("notices")
.select("*")
.order("created_at", { ascending: false });

  if(error){ noticeList.innerHTML = "লোড করা যায়নি"; return; }

  noticeList.innerHTML = data.map(notice => `
    <div class="notice-item">
      <strong>${notice.title}</strong>
      <small>${notice.category} | ${notice.notice_date} ${notice.is_pinned? '📌' : ''}</small>
      <button onclick="deleteNotice(${notice.id})" style="float:right;background:red;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer">Delete</button>
    </div>
  `).join("");
}

// 3. Delete Notice
async function deleteNotice(id) {
  if(!confirm("নিশ্চিতভাবে Delete করবেন?")) return;
  const { error } = await window.FDC_SUPABASE.from("notices").delete().eq("id", id);
  if(error) alert("Delete করা যায়নি: " + error.message);
  else loadNotices();
}

// Page Load হলে Notice List Load করো
document.addEventListener("fdc:supabase-ready", loadNotices);