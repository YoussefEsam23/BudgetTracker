import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, addDoc, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {

  constructor(private firestore: Firestore) { }

  // ==============================
  // TRANSACTIONS
  // ==============================
  getUserTransactions(userId: string): Observable<any[]> {
    const transactionsRef = collection(this.firestore, 'transactions');
    const q = query(transactionsRef, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }); // idField ensures we get the Firebase Document ID!
  }

  addTransaction(transactionData: any) {
    const transactionsRef = collection(this.firestore, 'transactions');
    return addDoc(transactionsRef, transactionData);
  }

  // --- NEW: Update and Delete Transactions ---
  updateTransaction(id: string, data: any) {
    const docRef = doc(this.firestore, `transactions/${id}`);
    return updateDoc(docRef, data);
  }

  deleteTransaction(id: string) {
    const docRef = doc(this.firestore, `transactions/${id}`);
    return deleteDoc(docRef);
  }

  // ==============================
  // BUDGETS
  // ==============================
  getUserBudgets(userId: string): Observable<any[]> {
    const budgetsRef = collection(this.firestore, 'budgets');
    const q = query(budgetsRef, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' });
  }

  addBudget(budgetData: any) {
    const budgetsRef = collection(this.firestore, 'budgets');
    return addDoc(budgetsRef, budgetData);
  }

  // --- NEW: Update and Delete Budgets ---
  updateBudget(id: string, data: any) {
    const docRef = doc(this.firestore, `budgets/${id}`);
    return updateDoc(docRef, data);
  }

  deleteBudget(id: string) {
    const docRef = doc(this.firestore, `budgets/${id}`);
    return deleteDoc(docRef);
  }

  // ==============================
  // GOALS
  // ==============================
  getUserGoals(userId: string): Observable<any[]> {
    const goalsRef = collection(this.firestore, 'goals');
    const q = query(goalsRef, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' });
  }

  addGoal(goalData: any) {
    const goalsRef = collection(this.firestore, 'goals');
    return addDoc(goalsRef, goalData);
  }

  // --- NEW: Update and Delete Goals ---
  updateGoal(id: string, data: any) {
    const docRef = doc(this.firestore, `goals/${id}`);
    return updateDoc(docRef, data);
  }

  deleteGoal(id: string) {
    const docRef = doc(this.firestore, `goals/${id}`);
    return deleteDoc(docRef);
  }
}