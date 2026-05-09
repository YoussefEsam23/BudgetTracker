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
  
  constructor(private router: Router, public auth: Auth) {}

  isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/';
  }

  onLogout() {
    this.auth.signOut().then(() => {
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error("Logout error:", error);
    });
  }
}