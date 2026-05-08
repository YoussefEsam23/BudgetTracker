import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinanceService } from '../../services/finance/finance';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.html',
  styleUrls: ['./budget.css'],
  standalone: false
})
export class Budget implements OnInit, OnDestroy {
  budgetForm!: FormGroup;
  budgets: any[] = [];
  userId: string = '';
  editingId: string | null = null;
  
  totalIncome = 0;
  totalBudgeted = 0;
  totalSaved = 0; // <-- NEW: Track total money locked in goals
  unallocatedFunds = 0;

  private authSub!: Subscription;
  private dataSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService,
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.budgetForm = this.fb.group({
      category: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]]
    });

    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.loadBudgetData();
      }
    });
  }

  loadBudgetData() {
    this.dataSub = combineLatest([
      this.financeService.getUserBudgets(this.userId),
      this.financeService.getUserTransactions(this.userId),
      this.financeService.getUserGoals(this.userId)
    ]).subscribe(([budgetsData, transactionsData, goalsData]) => {
      
      this.totalIncome = 0;
      this.totalBudgeted = 0;
      this.totalSaved = 0; 
      
      // --- NEW: Get the current month and year ---
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // 1. Calculate Income Pool (Only for this month!)
      transactionsData.forEach(t => {
        const txDate = new Date(t.date);
        if (t.type === 'income' && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          this.totalIncome += (Number(t.amount) || 0);
        }
      });

      // 2. Calculate Money locked in Budget Categories (Limits stay the same every month)
      budgetsData.forEach(b => {
        this.totalBudgeted += (Number(b.amount) || 0);
      });

      // 3. Calculate Money locked in Savings Goals (Goals carry over month-to-month)
      goalsData.forEach(g => {
        this.totalSaved += (Number(g.savedAmount) || 0); 
      });

      // Leftover Money = Income (This Month) - Planned Spending - Locked Savings
      this.unallocatedFunds = this.totalIncome - this.totalBudgeted - this.totalSaved;

      // 4. Map the budgets and calculate progress
      this.budgets = budgetsData.map(budget => {
        
        // --- THE FIX: Only count expenses from THIS month ---
        const spent = transactionsData
          .filter(t => {
            const txDate = new Date(t.date);
            return t.type === 'expense' && 
                   t.category === budget.category &&
                   txDate.getMonth() === currentMonth && 
                   txDate.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + Number(t.amount), 0);

        let progress = (spent / Number(budget.amount)) * 100;
        if (progress > 100) progress = 100;

        return {
          ...budget,
          spent: spent,
          progress: progress,
          isOverBudget: spent > Number(budget.amount)
        };
      });

      this.cdr.detectChanges();
    });
  }

  onSubmit() {
    if (this.budgetForm.valid && this.userId) {
      const limitAmt = Number(this.budgetForm.value.amount);

      // Warning includes the new calculation!
      if (!this.editingId && limitAmt > this.unallocatedFunds) {
        if(!confirm(`Warning: This limit ($${limitAmt}) is larger than your Unallocated Funds ($${this.unallocatedFunds}). Create anyway?`)) {
          return;
        }
      }

      const budgetData = {
        category: this.budgetForm.value.category,
        amount: limitAmt,
        userId: this.userId,
        createdAt: new Date().toISOString()
      };

      if (this.editingId) {
        this.financeService.updateBudget(this.editingId, budgetData).then(() => {
          this.cancelEdit();
        });
      } else {
        this.financeService.addBudget(budgetData).then(() => {
          this.budgetForm.reset();
        });
      }
    }
  }

  editBudget(b: any) {
    this.editingId = b.id;
    this.budgetForm.patchValue({
      category: b.category,
      amount: b.amount
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteBudget(id: string) {
    if (confirm('Are you sure you want to delete this budget category?')) {
      this.financeService.deleteBudget(id).catch(err => console.error(err));
    }
  }

  cancelEdit() {
    this.editingId = null;
    this.budgetForm.reset();
  }

  ngOnDestroy(): void {
    if (this.authSub) this.authSub.unsubscribe();
    if (this.dataSub) this.dataSub.unsubscribe();
  }
}