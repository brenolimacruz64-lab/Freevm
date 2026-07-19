#!/bin/bash
# ============================================
# 🚀 Auto Installer: Windows 11 on Docker + Cloudflare Tunnel
# ============================================

set -Eeuo pipefail

# --- Error handling ---------------------------------------------------------
# Report exactly where a failure happened instead of exiting silently.
on_error() {
  local exit_code=$?
  local line=$1
  echo >&2
  echo "❌ ERROR: perintah gagal (exit code ${exit_code}) pada baris ${line}: ${BASH_COMMAND}" >&2
  echo "   Instalasi dibatalkan." >&2
  exit "${exit_code}"
}
trap 'on_error ${LINENO}' ERR

# Fail loudly (non-zero) with a clear message.
die() {
  echo >&2
  echo "❌ ERROR: $*" >&2
  exit 1
}

echo "=== 🔧 Menjalankan sebagai root ==="
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  die "Script ini butuh akses root. Jalankan dengan: sudo bash rdp.sh"
fi

# Ensure required base commands exist before doing anything.
for cmd in apt systemctl wget grep; do
  command -v "$cmd" >/dev/null 2>&1 || die "Perintah '$cmd' tidak ditemukan. Tidak bisa melanjutkan."
done

echo
echo "=== 📦 Update & Install Docker Compose ==="
apt update -y || die "Gagal menjalankan 'apt update'. Cek koneksi jaringan / repositori APT."
apt install docker-compose -y || die "Gagal menginstal 'docker-compose' via APT."

# Pick whichever compose implementation is available.
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  die "Tidak menemukan 'docker-compose' maupun 'docker compose' setelah instalasi."
fi

systemctl enable docker || die "Gagal meng-enable service docker."
systemctl start docker || die "Gagal menjalankan service docker."

# Verify the docker daemon actually responds before relying on it.
docker info >/dev/null 2>&1 || die "Docker daemon tidak merespons. Cek 'systemctl status docker'."

echo
echo "=== 📂 Membuat direktori kerja dockercom ==="
mkdir -p /root/dockercom || die "Gagal membuat direktori /root/dockercom."
cd /root/dockercom || die "Gagal masuk ke direktori /root/dockercom."

echo
echo "=== 🧾 Membuat file windows.yml ==="
cat > windows.yml <<'EOF'
version: "3.9"
services:
  windows:
    image: dockurr/windows
    container_name: windows
    environment:
      VERSION: "11"
      USERNAME: "MASTER"
      PASSWORD: "admin@123"
      RAM_SIZE: "7G"
      CPU_CORES: "4"
    devices:
      - /dev/kvm
      - /dev/net/tun
    cap_add:
      - NET_ADMIN
    ports:
      - "8006:8006"
      - "3389:3389/tcp"
      - "3389:3389/udp"
    volumes:
      - /tmp/windows-storage:/storage
    restart: always
    stop_grace_period: 2m

EOF

echo
echo "=== ✅ File windows.yml berhasil dibuat ==="
cat windows.yml

echo
echo "=== 🚀 Menjalankan Windows 11 container ==="
$COMPOSE_CMD -f windows.yml up -d || die "Gagal menjalankan container Windows via '$COMPOSE_CMD'."

echo
echo "=== ☁️ Instalasi Cloudflare Tunnel ==="
if [ ! -x "/usr/local/bin/cloudflared" ]; then
  CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
  echo "Mengunduh cloudflared dari ${CF_URL} ..."
  # Download to a temp file and validate before installing so a partial or
  # HTML error response never gets marked executable and used later.
  tmp_cf="$(mktemp)"
  if ! wget -q "${CF_URL}" -O "${tmp_cf}"; then
    rm -f "${tmp_cf}"
    die "Gagal mengunduh cloudflared. Cek koneksi jaringan."
  fi
  if [ ! -s "${tmp_cf}" ]; then
    rm -f "${tmp_cf}"
    die "File cloudflared yang terunduh kosong."
  fi
  chmod +x "${tmp_cf}"
  # Confirm the binary actually runs before trusting it.
  if ! "${tmp_cf}" --version >/dev/null 2>&1; then
    rm -f "${tmp_cf}"
    die "Binary cloudflared yang terunduh tidak valid / tidak bisa dijalankan."
  fi
  mv "${tmp_cf}" /usr/local/bin/cloudflared || die "Gagal memasang cloudflared ke /usr/local/bin."
fi

echo
echo "=== 🌍 Membuat tunnel publik untuk akses web & RDP ==="

# Launch a tunnel in the background and make sure it is actually alive,
# instead of silently ignoring an immediate crash.
start_tunnel() {
  local url=$1 logfile=$2 label=$3
  : > "${logfile}"
  nohup cloudflared tunnel --url "${url}" > "${logfile}" 2>&1 &
  local pid=$!
  # Give it a moment, then verify the process didn't die on startup.
  sleep 2
  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "⚠️ Tunnel ${label} gagal dijalankan. Isi log:" >&2
    tail -n 20 "${logfile}" >&2 || true
    return 1
  fi
  echo "${pid}"
}

WEB_LOG="/var/log/cloudflared_web.log"
RDP_LOG="/var/log/cloudflared_rdp.log"

WEB_PID="$(start_tunnel "http://localhost:8006" "${WEB_LOG}" "Web (8006)")" \
  || die "Tunnel Web gagal dijalankan. Cek ${WEB_LOG}."
RDP_PID="$(start_tunnel "tcp://localhost:3389" "${RDP_LOG}" "RDP (3389)")" \
  || die "Tunnel RDP gagal dijalankan. Cek ${RDP_LOG}."

# Poll the logs for the generated links instead of a single fixed sleep so a
# slow-but-healthy tunnel is not misreported as a failure.
wait_for_link() {
  local logfile=$1 pattern=$2 pid=$3 tries=30 match=""
  for ((i = 0; i < tries; i++)); do
    match="$(grep -oE "${pattern}" "${logfile}" 2>/dev/null | head -n 1 || true)"
    if [ -n "${match}" ]; then
      echo "${match}"
      return 0
    fi
    # If the tunnel process has died while we wait, stop early.
    if ! kill -0 "${pid}" 2>/dev/null; then
      return 1
    fi
    sleep 2
  done
  return 1
}

CF_WEB="$(wait_for_link "${WEB_LOG}" 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "${WEB_PID}" || true)"
CF_RDP="$(wait_for_link "${RDP_LOG}" 'tcp://[a-zA-Z0-9.-]*\.trycloudflare\.com:[0-9]*' "${RDP_PID}" || true)"

echo
echo "=============================================="
echo "🎉 Instalasi Selesai!"
echo

# Track whether any required link is missing so we can propagate a failure
# exit code instead of always exiting 0.
missing=0

if [ -n "${CF_WEB}" ]; then
  echo "🌍 Web Console (NoVNC / UI):"
  echo "    ${CF_WEB}"
else
  echo "⚠️ Tidak menemukan link web Cloudflare (port 8006)"
  echo "    Cek log: tail -f ${WEB_LOG}"
  missing=1
fi

if [ -n "${CF_RDP}" ]; then
  echo
  echo "🖥️  Remote Desktop (RDP) melalui Cloudflare:"
  echo "    ${CF_RDP}"
else
  echo
  echo "⚠️ Tidak menemukan link RDP Cloudflare (port 3389)"
  echo "    Cek log: tail -f ${RDP_LOG}"
  missing=1
fi

echo
echo "🔑 Username: MASTER"
echo "🔒 Password: admin@123"
echo
echo "Untuk melihat status container:"
echo "  docker ps"
echo
echo "Untuk menghentikan VM:"
echo "  docker stop windows"
echo
echo "Untuk melihat log Windows:"
echo "  docker logs -f windows"
echo
echo "Untuk melihat link Cloudflare:"
echo "  grep 'trycloudflare' /var/log/cloudflared_*.log"
echo
echo "=== ✅ Windows 11 di Docker siap digunakan! ==="
echo "=============================================="

# Propagate failure: the container is up, but if the public links were never
# generated the setup is not usable, so exit non-zero for callers/automation.
if [ "${missing}" -ne 0 ]; then
  die "Sebagian tunnel Cloudflare gagal dibuat. Lihat peringatan di atas."
fi
