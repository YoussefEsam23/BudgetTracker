import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing-module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select'; // <-- NEW

// Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 

// Firebase Imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore'; 

// Components
import { App } from './app';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Budget } from './components/budget/budget';
import { Transactions } from './components/transactions/transactions';
import { Goals } from './components/goals/goals';
import { Reports } from './components/reports/reports';

const firebaseConfig = {
  apiKey: "AIzaSyDNYq5s2YbFGvNX7qn_tsoxSy-nnWF0MqA",
  authDomain: "budgettracker-f2e94.firebaseapp.com",
  projectId: "budgettracker-f2e94",
  storageBucket: "budgettracker-f2e94.firebasestorage.app",
  messagingSenderId: "667189806968",
  appId: "1:667189806968:web:909e12683b8302c024ea8d"
};

@NgModule({
  declarations: [
    App,
    Login,
    Dashboard,
    Budget,
    Transactions,
    Goals,
    Reports
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule // <-- NEW: Added here
  ],
  providers: [
    provideAnimations(), 
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ],
  bootstrap: [App]
})
export class AppModule { }