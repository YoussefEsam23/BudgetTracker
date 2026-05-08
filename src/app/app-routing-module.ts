import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Budget } from './components/budget/budget';
import { Transactions } from './components/transactions/transactions';
import { Goals } from './components/goals/goals';
import { Reports } from './components/reports/reports';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'budget', component: Budget },
  { path: 'transactions', component: Transactions },
  { path: 'goals', component: Goals },
  { path: 'reports', component: Reports },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }