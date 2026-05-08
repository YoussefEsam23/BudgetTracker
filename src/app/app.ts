import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: false
})
export class App {
  
  // THE FIX: Added 'public auth: Auth' so the HTML template can read auth.currentUser
  constructor(private router: Router, public auth: Auth) {}

  // Helper to hide navbar on login
  isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/';
  }

  onLogout() {
    // Upgraded: Actually signs the user out of Firebase before redirecting
    this.auth.signOut().then(() => {
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error("Logout error:", error);
    });
  }
}