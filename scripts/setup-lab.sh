#!/bin/bash

LAB_DIR="./root"
TARGET_DIR="$LAB_DIR/var/www/images/icons"

rm -rf "$LAB_DIR"
mkdir -p "$LAB_DIR"

echo "--- Current Directory ---"
ls -lt .
echo "-------------------------------"

mkdir -p "$LAB_DIR/etc"
mkdir -p "$LAB_DIR/var"
mkdir -p "$LAB_DIR/var/log"
mkdir -p "$LAB_DIR/home/jdoe1"
mkdir -p "$LAB_DIR/home/jdoe2"
mkdir -p "$LAB_DIR/home/jdoe3"
mkdir -p "$LAB_DIR/home/jdoe4"
mkdir -p "$LAB_DIR/home/jdoe5"
mkdir -p "$LAB_DIR/var/www"
mkdir -p "$LAB_DIR/var/www/images"
mkdir -p "$TARGET_DIR"

# 1. Document Icon
cat << 'EOF' > "$TARGET_DIR/document.svg"
<svg xmlns="http://www.w3.org/2000/svg" width="45" height="50">
  <path stroke="#E82" fill="#EEE" d="m2,5h35v40h-35z"/>
  <path stroke="#333" d="m6,12h27m0,4h-27m0,4h15m12,6h-27m0,4h27m0,4h-27m0,4h9"/>
  <path stroke="#000" stroke-width=".5" fill="#dd0" d="m40,6 3,2-20,30-5.5,5 2.5-6z"/>
  <path fill="#FA3" d="m20.2,36 3,2-5.6,5z"/>
</svg>
EOF

# 2. Biohazard / DNA Icon
cat << 'EOF' > "$TARGET_DIR/dna.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50">
  <path fill="none" stroke="#22d3ee" stroke-width="4" d="M30,20 Q50,50 70,20 M30,80 Q50,50 70,80" />
  <circle fill="#22d3ee" cx="30" cy="20" r="5" />
  <circle fill="#22d3ee" cx="70" cy="20" r="5" />
  <circle fill="#22d3ee" cx="30" cy="80" r="5" />
  <circle fill="#22d3ee" cx="70" cy="80" r="5" />
  <path stroke="#22d3ee" stroke-width="2" d="M40,35 H60 M38,50 H62 M40,65 H60" />
</svg>
EOF

# 3. Radar / Eye Icon
cat << 'EOF' > "$TARGET_DIR/eye.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50">
  <circle cx="50" cy="50" r="40" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4" />
  <circle cx="50" cy="50" r="20" fill="none" stroke="#fbbf24" stroke-width="2" />
  <path fill="#fbbf24" d="M50,30 A20,20 0 0,1 70,50 L50,50 Z" opacity="0.5" />
  <circle fill="#fbbf24" cx="50" cy="50" r="5" />
</svg>
EOF

# 4. Shield / Security Icon
cat << 'EOF' > "$TARGET_DIR/security.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50">
  <path fill="#f87171" d="M50,10 L80,25 V50 C80,70 50,90 50,90 C50,90 20,70 20,50 V25 L50,10 Z" />
  <path fill="#fff" opacity="0.3" d="M50,10 V90 C50,90 80,70 80,50 V25 L50,10 Z" />
</svg>
EOF

mkdir -p public
touch public/index.html

touch "$LAB_DIR/home/jdoe1/secret.txt"
echo $DIRECTORY_TRAVERSAL_JDOE1_SECRET > "$LAB_DIR/home/jdoe1/secret.txt"

touch "$LAB_DIR/home/jdoe2/secret.txt"
echo $DIRECTORY_TRAVERSAL_JDOE2_SECRET > "$LAB_DIR/home/jdoe2/secret.txt"

touch "$LAB_DIR/home/jdoe3/secret.txt"
echo $DIRECTORY_TRAVERSAL_JDOE3_SECRET > "$LAB_DIR/home/jdoe3/secret.txt"

touch "$LAB_DIR/home/jdoe4/secret.txt"
echo $DIRECTORY_TRAVERSAL_JDOE4_SECRET > "$LAB_DIR/home/jdoe4/secret.txt"

touch "$LAB_DIR/home/jdoe5/secret.txt"
echo $DIRECTORY_TRAVERSAL_JDOE5_SECRET > "$LAB_DIR/home/jdoe5/secret.txt"


echo "root:x:0:0:root:/root:/bin/bash" > "$LAB_DIR/etc/passwd"
echo "games:x:5:60:games:/usr/games:/sbin/nologin" >> "$LAB_DIR/etc/passwd"
echo "sbx_user105:x:990:990:Sandbox User:/:/sbin/nologin" >> "$LAB_DIR/etc/passwd"

echo "FLAG{TRAVERSAL_MASTER_2026}" > "$LAB_DIR/var/log/system.log"
echo "Secret note: The admin password is hidden in the environment variables." > "$LAB_DIR/home/user/note.txt"

echo "Lab environment provisioned successfully."
