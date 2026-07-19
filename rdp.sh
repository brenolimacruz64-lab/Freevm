#!/bin/bash
# ============================================
# 🚀 Auto Installer: Windows 11 on Docker + Cloudflare Tunnel
# ============================================

set -e

# ============================================
# 🧰 Shared utilities
# ============================================

# Print a blank line followed by a "=== message ===" section header.
section() {
  echo
  echo "=== $1 ==="
}

# Ensure the cloudflared binary is installed.
install_cloudflared() {
  if [ ! -f "/usr/local/bin/cloudflared" ]; then
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
  fi
}

# Start a cloudflared tunnel in the background.
# $1 = target url, $2 = logfile
start_tunnel() {
  nohup cloudflared tunnel --url "$1" > "$2" 2>&1 &
}

# Extract the first matching cloudflare link from a log file.
# $1 = grep pattern, $2 = logfile
extract_link() {
  grep -o "$1" "$2" | head -n 1
}

# Print a discovered link or a warning if it was not found.
# $1 = link value, $2 = success label, $3 = warning message, $4 = logfile
print_link() {
  if [ -n "$1" ]; then
    echo "$2"
    echo "    $1"
  else
    echo "$3"
    echo "    Cek log: tail -f $4"
  fi
}

section "🔧 Menjalankan sebagai root"
if [ "$EUID" -ne 0 ]; then
  echo "Script ini butuh akses root. Jalankan dengan: sudo bash install-windows11-cloudflare.sh"
  exit 1
fi

section "📦 Update & Install Docker Compose"
apt update -y
apt install docker-compose -y

systemctl enable docker
systemctl start docker

section "📂 Membuat direktori kerja dockercom"
mkdir -p /root/dockercom
cd /root/dockercom

section "🧾 Membuat file windows.yml"
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

section "✅ File windows.yml berhasil dibuat"
cat windows.yml

section "🚀 Menjalankan Windows 11 container"
docker-compose -f windows.yml up -d

section "☁️ Instalasi Cloudflare Tunnel"
install_cloudflared

section "🌍 Membuat tunnel publik untuk akses web & RDP"
start_tunnel "http://localhost:8006" /var/log/cloudflared_web.log
start_tunnel "tcp://localhost:3389" /var/log/cloudflared_rdp.log
sleep 6

CF_WEB=$(extract_link "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" /var/log/cloudflared_web.log)
CF_RDP=$(extract_link "tcp://[a-zA-Z0-9.-]*\.trycloudflare\.com:[0-9]*" /var/log/cloudflared_rdp.log)

echo
echo "=============================================="
echo "🎉 Instalasi Selesai!"
echo
print_link "$CF_WEB" "🌍 Web Console (NoVNC / UI):" "⚠️ Tidak menemukan link web Cloudflare (port 8006)" /var/log/cloudflared_web.log

echo
print_link "$CF_RDP" "🖥️  Remote Desktop (RDP) melalui Cloudflare:" "⚠️ Tidak menemukan link RDP Cloudflare (port 3389)" /var/log/cloudflared_rdp.log

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
section "✅ Windows 11 di Docker siap digunakan!"
echo "=============================================="
