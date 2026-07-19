#!/bin/bash
# ============================================
# 🚀 Auto Installer: Windows 11 on Docker + Cloudflare Tunnel
# ============================================

set -e

echo "=== 🔧 Menjalankan sebagai root ==="
if [ "$EUID" -ne 0 ]; then
  echo "Script ini butuh akses root. Jalankan dengan: sudo bash install-windows11-cloudflare.sh"
  exit 1
fi

echo
echo "=== 📦 Update & Install Docker Compose ==="
apt update -y
apt install docker-compose -y

systemctl enable docker
systemctl start docker

echo
echo "=== 📂 Membuat direktori kerja dockercom ==="
mkdir -p /root/dockercom
cd /root/dockercom

echo
echo "=== 🔐 Menyiapkan kredensial Windows ==="
# Jangan hardcode kredensial. Gunakan variabel lingkungan bila tersedia,
# jika tidak, buat password acak yang kuat.
WIN_USERNAME="${WIN_USERNAME:-MASTER}"
if [ -z "${WIN_PASSWORD:-}" ]; then
  WIN_PASSWORD="$(openssl rand -base64 18 2>/dev/null || tr -dc 'A-Za-z0-9!@#%_+=' < /dev/urandom | head -c 20)"
  GENERATED_PASSWORD=1
fi

# Simpan storage di direktori khusus (bukan /tmp yang world-readable & mudah terhapus).
STORAGE_DIR="/root/dockercom/windows-storage"
mkdir -p "$STORAGE_DIR"
chmod 700 "$STORAGE_DIR"

echo
echo "=== 🧾 Membuat file windows.yml ==="
cat > windows.yml <<EOF
version: "3.9"
services:
  windows:
    image: dockurr/windows
    container_name: windows
    environment:
      VERSION: "11"
      USERNAME: "${WIN_USERNAME}"
      PASSWORD: "${WIN_PASSWORD}"
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
      - ${STORAGE_DIR}:/storage
    restart: always
    stop_grace_period: 2m

EOF
chmod 600 windows.yml

echo
echo "=== ✅ File windows.yml berhasil dibuat ==="
# Jangan cetak isi windows.yml karena memuat kredensial.
grep -v -E 'PASSWORD|USERNAME' windows.yml

echo
echo "=== 🚀 Menjalankan Windows 11 container ==="
docker-compose -f windows.yml up -d

echo
echo "=== ☁️ Instalasi Cloudflare Tunnel ==="
if [ ! -f "/usr/local/bin/cloudflared" ]; then
  CF_TMP="$(mktemp)"
  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O "$CF_TMP"
  # Verifikasi integritas biner terhadap checksum resmi Cloudflare.
  if wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.sha256 -O "$CF_TMP.sha256"; then
    EXPECTED="$(awk '{print $1}' "$CF_TMP.sha256")"
    ACTUAL="$(sha256sum "$CF_TMP" | awk '{print $1}')"
    if [ -n "$EXPECTED" ] && [ "$EXPECTED" != "$ACTUAL" ]; then
      echo "❌ Checksum cloudflared tidak cocok. Membatalkan."
      rm -f "$CF_TMP" "$CF_TMP.sha256"
      exit 1
    fi
  else
    echo "⚠️ Tidak dapat mengunduh checksum cloudflared; melewati verifikasi."
  fi
  install -m 755 "$CF_TMP" /usr/local/bin/cloudflared
  rm -f "$CF_TMP" "$CF_TMP.sha256"
fi

echo
echo "=== 🌍 Membuat tunnel publik untuk akses web & RDP ==="
nohup cloudflared tunnel --url http://localhost:8006 > /var/log/cloudflared_web.log 2>&1 &
nohup cloudflared tunnel --url tcp://localhost:3389 > /var/log/cloudflared_rdp.log 2>&1 &
sleep 6

CF_WEB=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" /var/log/cloudflared_web.log | head -n 1)
CF_RDP=$(grep -o "tcp://[a-zA-Z0-9.-]*\.trycloudflare\.com:[0-9]*" /var/log/cloudflared_rdp.log | head -n 1)

echo
echo "=============================================="
echo "🎉 Instalasi Selesai!"
echo
if [ -n "$CF_WEB" ]; then
  echo "🌍 Web Console (NoVNC / UI):"
  echo "    ${CF_WEB}"
else
  echo "⚠️ Tidak menemukan link web Cloudflare (port 8006)"
  echo "    Cek log: tail -f /var/log/cloudflared_web.log"
fi

if [ -n "$CF_RDP" ]; then
  echo
  echo "🖥️  Remote Desktop (RDP) melalui Cloudflare:"
  echo "    ${CF_RDP}"
else
  echo "⚠️ Tidak menemukan link RDP Cloudflare (port 3389)"
  echo "    Cek log: tail -f /var/log/cloudflared_rdp.log"
fi

echo
echo "🔑 Username: ${WIN_USERNAME}"
if [ "${GENERATED_PASSWORD:-0}" = "1" ]; then
  echo "🔒 Password (dibuat otomatis, SIMPAN sekarang): ${WIN_PASSWORD}"
  echo "   ⚠️ Password ini hanya ditampilkan sekali di sini."
else
  echo "🔒 Password: (menggunakan nilai dari variabel WIN_PASSWORD)"
fi
echo
echo "⚠️  PERINGATAN KEAMANAN: RDP & Web Console kini terekspos ke internet"
echo "    publik melalui Cloudflare Tunnel tanpa autentikasi tambahan."
echo "    Gunakan Cloudflare Access / firewall dan password kuat."
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
