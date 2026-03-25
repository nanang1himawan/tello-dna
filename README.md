# Office Management Application

This is a full-stack Office Management application built with **React (Vite)** for the frontend and **PHP/MySQL** for the backend API.

## Project Structure

- `frontend/`: React + Vite application (User Interface)
- `backend/`: Raw PHP API (Data Management)

## Prerequisites

To run this project on an Ubuntu system, you will need to install the following software packages:
- **Node.js** (v18 or higher) and **npm**
- **PHP** (v8.0 or higher)
- **MySQL Server**
- **Apache2** (Optional, you can also use PHP's built-in web server for development)

---

## Step 1: System and Package Setup (Ubuntu)

First, update your package list and install the required native dependencies:

```bash
sudo apt update
sudo apt upgrade -y

# Install PHP and essential extensions
sudo apt install -y php php-cli php-mysql php-curl php-json php-mbstring php-xml php-pdo

# Install MySQL Server
sudo apt install -y mysql-server

# Install Node.js and npm (Using NodeSource for modern Node version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Step 2: Database Setup

1. **Start the MySQL service**:
   ```bash
   sudo systemctl start mysql
   sudo systemctl enable mysql
   ```

2. **Access the MySQL console as root**:
   ```bash
   sudo mysql
   ```
   *(If prompted for a password, enter your MySQL root password. Alternatively: `mysql -u root -p`)*

3. **Create the Database Application**:
   Inside the MySQL shell, run the following command to create the database:
   ```sql
   CREATE DATABASE office_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

4. **Import the Database Schema**:
   Navigate to the repository root and import the initial schema file into MySQL:
   ```bash
   cd backend/database
   mysql -u root -p office_app < office_app.sql
   ```

**Configure Database Connection (Optional)**:
If you need to change the database credentials, open `backend/config/database.php` and edit the following constants with your database details:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'office_app');
define('DB_USER', 'root');
define('DB_PASS', ''); // Change this to your MySQL password if it's not empty
```

---

## Step 3: Running the Backend (API)

For local development, the easiest way to serve the backend is using PHP's built-in server. 

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Start the PHP server on port 8000:
   ```bash
   php -S localhost:8000
   ```
   *The backend API is now running at `http://localhost:8000`.*

---

## Step 4: Running the Frontend (React App)

The frontend is a React project powered by Vite.

1. Open a new terminal instance and navigate to the frontend directory:
   ```bash
   # From the project root
   cd frontend
   ```

2. **Configure Environment Variables**:
   In the `frontend/` directory, edit the `.env` file to ensure the API URL matches where your PHP backend is running.
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Install Node Dependencies**:
   ```bash
   npm install
   ```

4. **Start the Vite Development Server**:
   ```bash
   npm run dev
   ```

The terminal will output a URL (usually `http://localhost:5173`) where you can access the frontend application in your browser.
