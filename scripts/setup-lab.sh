#!/bin/bash

LAB_DIR="./root"

rm -rf $LAB_DIR
mkdir -p $LAB_DIR

mkdir -p $LAB_DIR/etc
mkdir -p $LAB_DIR/var/log
mkdir -p $LAB_DIR/home/user

echo "root:x:0:0:root:/root:/bin/bash" > $LAB_DIR/etc/passwd
echo "games:x:5:60:games:/usr/games:/sbin/nologin" >> $LAB_DIR/etc/passwd
echo "sbx_user105:x:990:990:Sandbox User:/:/sbin/nologin" >> $LAB_DIR/etc/passwd

echo "FLAG{TRAVERSAL_MASTER_2026}" > $LAB_DIR/var/log/system.log
echo "Secret note: The admin password is hidden in the environment variables." > $LAB_DIR/home/user/note.txt

echo "Lab environment provisioned successfully."
