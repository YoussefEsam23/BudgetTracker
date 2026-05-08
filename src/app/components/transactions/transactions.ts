import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinanceService } from '../../services/finance/finance';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.css'],
  standalone: false
})
export class Transactions implements OnInit, OnDestroy {
  transactionForm!: FormGroup;
  transactions: any[] = [];
  filteredTransactions: any[] = []; 
  budgets: any[] = []; 
  
  uniqueIncomeSources: string[] = []; 
  
  userId: string = '';
  editingId: string | null = null; 
  
  searchTerm: string = '';
  selectedFilterType: string = 'all'; 
  selectedFilterCategory: string = 'all';

  private authSub!: Subscription;
  private dataSub!: Subscription;
  private budgetSub!: Subscription; 

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService,
    private auth: Auth,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.transactionForm = this.fb.group({
      text: ['', Validators.required], 
      amount: ['', [Validators.required, Validators.min(1)]],
      type: ['expense', Validators.required],
      category: [''], 
      newCategory: [''], 
      isRecurring: [false]
    });

    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.loadTransactions();
        this.loadBudgets(); 
      }
    });
  }

  loadBudgets() {
    this.budgetSub = this.financeService.getUserBudgets(this.userId).subscribe(data => {
      this.budgets = data;
    });
  }

  loadTransactions() {
    this.dataSub = this.financeService.getUserTransactions(this.userId).subscribe(data => {
      this.transactions = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const historySources = this.transactions
        .filter(t => t.type === 'income' && t.category && t.category !== 'Uncategorized')
        .map(t => t.category);
      
      const defaultSources = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Refunds'];
      
      this.uniqueIncomeSources = [...new Set([...defaultSources, ...historySources])]; 

      this.runFilters(); 
    });
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.runFilters();
  }

  onTypeFilterChange(value: string) {
    this.selectedFilterType = value;
    this.selectedFilterCategory = 'all'; 
    this.runFilters();
  }

  onCategoryFilterChange(value: string) {
    this.selectedFilterCategory = value;
    this.runFilters();
  }

  runFilters() {
    this.filteredTransactions = this.transactions.filter(t => {
      const searchLower = this.searchTerm.toLowerCase().trim();
      const textLower = t.text.toLowerCase();
      
      const matchesSearch = searchLower === '' || 
                            textLower.startsWith(searchLower) || 
                            textLower.includes(' ' + searchLower);

      const matchesType = this.selectedFilterType === 'all' || t.type === this.selectedFilterType;
      
      const txCategory = t.category || 'Uncategorized';
      const matchesCategory = this.selectedFilterCategory === 'all' || txCategory === this.selectedFilterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
    this.cdr.detectChanges();
  }

  onSubmit() {
    if (this.transactionForm.valid && this.userId) {
      
      let finalCategory = this.transactionForm.value.category;
      
      if (this.transactionForm.value.type === 'income' && finalCategory === 'NEW_CUSTOM') {
        finalCategory = this.transactionForm.value.newCategory || 'Uncategorized';
      }

      const txData = {
        text: this.transactionForm.value.text,
        amount: Number(this.transactionForm.value.amount), 
        type: this.transactionForm.value.type,
        category: finalCategory || 'Uncategorized', 
        isRecurring: this.transactionForm.value.isRecurring || false, 
        userId: this.userId,
        date: new Date().toISOString() 
      };

      if (this.editingId) {
        this.financeService.updateTransaction(this.editingId, txData).then(() => {
          this.cancelEdit(); 
        });
      } else {
        this.financeService.addTransaction(txData).then(() => {
          this.transactionForm.reset({ type: 'expense', category: '', newCategory: '', isRecurring: false }); 
        });
      }
    }
  }

  editTransaction(tx: any) {
    this.editingId = tx.id; 
    
    let catValue = tx.category;
    if (tx.type === 'income' && !this.uniqueIncomeSources.includes(catValue) && catValue !== 'Uncategorized') {
        this.uniqueIncomeSources.push(catValue);
    }

    this.transactionForm.patchValue({
      text: tx.text,
      amount: tx.amount,
      type: tx.type,
      category: catValue || '',
      newCategory: '',
      isRecurring: tx.isRecurring || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteTransaction(id: string) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.financeService.deleteTransaction(id).catch(err => console.error("Delete failed:", err));
    }
  }

  cancelEdit() {
    this.editingId = null;
    this.transactionForm.reset({ type: 'expense', category: '', newCategory: '', isRecurring: false });
  }

  ngOnDestroy(): void {
    if (this.authSub) this.authSub.unsubscribe();
    if (this.dataSub) this.dataSub.unsubscribe();
    if (this.budgetSub) this.budgetSub.unsubscribe();
  }
}