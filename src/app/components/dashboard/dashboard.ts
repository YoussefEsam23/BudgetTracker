import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FinanceService } from '../../services/finance/finance';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription, combineLatest } from 'rxjs';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  standalone: false
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('financeChart') financeChart!: ElementRef;
  chart: any;

  userId: string = '';
  totalBalance: number = 0;
  totalIncome: number = 0;
  totalExpense: number = 0;
  isLoading: boolean = true;

  recentTransactions: any[] = [];
  budgetAlerts: any[] = [];
  topGoal: any = null;

  private authSub!: Subscription;
  private dataSub!: Subscription;

  constructor(
    private financeService: FinanceService,
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.loadDashboardData();
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDashboardData() {
    this.dataSub = combineLatest([
      this.financeService.getUserTransactions(this.userId),
      this.financeService.getUserBudgets(this.userId),
      this.financeService.getUserGoals(this.userId)
    ]).subscribe(([transactions, budgets, goals]) => {
      
      this.totalIncome = 0;
      this.totalExpense = 0;
      let totalSavings = 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // 1. Calculate Core Balances
      transactions.forEach(t => {
        if (t.type === 'income') this.totalIncome += Number(t.amount);
        if (t.type === 'expense') this.totalExpense += Number(t.amount);
      });
      this.totalBalance = this.totalIncome - this.totalExpense;

      goals.forEach(g => { totalSavings += Number(g.savedAmount); });

      // 2. Get Recent 4 Transactions
      this.recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);

      // 3. Find Budget Danger Zones (> 85% spent this month)
      this.budgetAlerts = budgets.map(b => {
        const spentThisMonth = transactions
          .filter(t => t.type === 'expense' && t.category === b.category && 
                       new Date(t.date).getMonth() === currentMonth && 
                       new Date(t.date).getFullYear() === currentYear)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const percentage = (spentThisMonth / Number(b.amount)) * 100;
        return { ...b, spent: spentThisMonth, percentage };
      }).filter(b => b.percentage >= 85);

      // 4. Find Goal Closest to Completion
      if (goals.length > 0) {
        this.topGoal = goals.map(g => {
          let percent = (Number(g.savedAmount) / Number(g.targetAmount)) * 100;
          return { ...g, percent: percent > 100 ? 100 : percent };
        }).sort((a, b) => b.percent - a.percent)[0]; 
      }

      this.isLoading = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.updateChart(this.totalIncome, this.totalExpense, totalSavings);
      }, 50);
    });
  }

  updateChart(income: number, expense: number, savings: number) {
    if (!this.financeChart) return; 

    const remaining = income - expense - savings;
    const pieTotal = income > 0 ? income : 1; 

    const getPercent = (value: number) => {
      return income > 0 ? ((value / pieTotal) * 100).toFixed(1) + '%' : '0%';
    };

    let dynamicLabels = [ 
      `Expenses (${getPercent(expense)})`, 
      `Savings Locked (${getPercent(savings)})`, 
      `Liquid Balance (${getPercent(remaining > 0 ? remaining : 0)})` 
    ];

    let chartData = [expense, savings, remaining > 0 ? remaining : 0];
    let bgColors = ['#ef4444', '#3f51b5', '#10b981'];

    // --- THE FIX: Prevent Chart from vanishing if all values are 0 ---
    if (expense === 0 && savings === 0 && remaining <= 0) {
      chartData = [1]; // Draw one solid piece
      bgColors = ['#e2e8f0']; // Light gray color
      dynamicLabels = ['No Data Yet (0%)'];
    }

    if (this.chart) {
      this.chart.data.labels = dynamicLabels;
      this.chart.data.datasets[0].data = chartData;
      this.chart.data.datasets[0].backgroundColor = bgColors;
      this.chart.update();
    } else {
      this.chart = new Chart(this.financeChart.nativeElement, {
        type: 'doughnut',
        data: {
          labels: dynamicLabels,
          datasets: [{
            data: chartData,
            backgroundColor: bgColors,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.authSub) this.authSub.unsubscribe();
    if (this.dataSub) this.dataSub.unsubscribe();
    if (this.chart) this.chart.destroy();
  }
}