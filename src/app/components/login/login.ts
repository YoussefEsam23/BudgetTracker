import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth'; // Import the service

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: false
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  isLoginMode = true;
  errorMessage = ''; // To show user friendly errors

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private authService: AuthService // Inject the service
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      // Firebase needs an email, so we validate for email format!
      email: ['', [Validators.required, Validators.email]], 
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = ''; 
    this.loginForm.reset();
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.errorMessage = ''; 

      try {
        if (this.isLoginMode) {
          await this.authService.login(email, password);
          console.log('Login successful!');
        } else {
          await this.authService.signUp(email, password);
          console.log('Signup successful!');
        }
        
        // Go to dashboard on success!
        this.router.navigate(['/dashboard']);
        
      } catch (error: any) {
        // Catch Firebase errors (wrong password, etc.)
        console.error('Firebase Auth Error:', error);
        this.errorMessage = error.message; 
      }
    }
  }
}