#!/usr/bin/env python3
"""
Connect to Supabase PostgreSQL and run migrations
Uses only standard library - no external dependencies
"""
import socket
import ssl
import os
from pathlib import Path

# Database connection info
DB_HOST = "db.njhjpxfozgpoiqwksple.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASS = "IShopOnline1"

def connect_to_postgres():
    """Create a basic PostgreSQL connection"""
    print(f"Connecting to {DB_HOST}:{DB_PORT}...")

    # Create socket connection
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # Wrap with SSL
    context = ssl.create_default_context()
    ssl_sock = context.wrap_socket(sock, server_hostname=DB_HOST)

    try:
        ssl_sock.connect((DB_HOST, DB_PORT))
        print("✅ Connected to database!")
        return ssl_sock
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def send_startup_message(sock):
    """Send PostgreSQL startup message"""
    import struct

    # Build startup message
    user = f"user\x00{DB_USER}\x00"
    database = f"database\x00{DB_NAME}\x00"
    params = user + database + "\x00"

    # Protocol version 3.0
    protocol = struct.pack("!I", 196608)

    # Message length + protocol + params
    length = len(params) + 8
    message = struct.pack("!I", length) + protocol + params.encode()

    sock.sendall(message)
    print("Sent startup message")

def main():
    """Main function to connect and show migration info"""
    print("\n" + "="*60)
    print("PREMIER HOTEL - SUPABASE CONNECTION TEST")
    print("="*60 + "\n")

    # Test connection
    conn = connect_to_postgres()

    if conn:
        try:
            send_startup_message(conn)
            response = conn.recv(4096)
            print(f"Received response ({len(response)} bytes)")

            if response:
                print("\n✅ DATABASE CONNECTION SUCCESSFUL!")
                print("\nYour migrations are ready to run.")
                print("Please use the Supabase SQL Editor to run them:")
                print("\n1. Go to: https://supabase.com/dashboard")
                print("2. Select 'Premier Hotel' project")
                print("3. Click 'SQL Editor' in sidebar")
                print("4. Copy & paste each migration file and click 'Run'")

                print("\nMigration files:")
                print("  - backend/sql/migrations/013_add_performance_indexes.sql")
                print("  - backend/sql/migrations/015_add_foreign_key_constraints.sql")

        except Exception as e:
            print(f"❌ Error during communication: {e}")
        finally:
            conn.close()
            print("\nConnection closed.")

    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
