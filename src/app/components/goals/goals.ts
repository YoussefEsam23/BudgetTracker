import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinanceService } from '../../services/finance/finance';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.html',
  styleUrls: ['./goals.css'],
  standalone: false
})
export class Goals implements OnInit, OnDestroy {
  goalForm!: FormGroup;
  goals: any[] = [];
  userId: string = '';
  editingId: string | null = null; // <-- NEW

  private authSub!: Subscription;
  private dataSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService,
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.goalForm = this.fb.group({
      name: ['', Validators.required], 
      targetAmount: ['', [Validators.required, Validators.min(1)]], 
      savedAmount: [0, [Validators.required, Validators.min(0)]] 
    });

    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.loadGoals();
      }
    });
  }

  loadGoals() {
    this.dataSub = this.financeService.getUserGoals(this.userId).subscribe(data => {
      this.goals = data.map(goal => {
        let progress = (Number(goal.savedAmount) / Number(goal.targetAmount)) * 100;
        return { ...goal, progress: progress > 100 ? 100 : progress };
      });
      this.cdr.detectChanges();
    });
  }

  onSubmit() {
    if (this.goalForm.valid && this.userId) {
      const goalData = {
        name: this.goalForm.value.name,
        targetAmount: Number(this.goalForm.value.targetAmount),
        savedAmount: Number(this.goalForm.value.savedAmount),
        userId: this.userId,
        createdAt: new Date().toISOString()
      };

      if (this.editingId) {
        this.financeService.updateGoal(this.editingId, goalData).then(() => {
          this.cancelEdit();
        });
      } else {
        this.financeService.addGoal(goalData).then(() => {
          this.goalForm.reset({ savedAmount: 0 });
        });
      }
    }
  }

  // --- NEW CRUD METHODS ---
  editGoal(g: any) {
    this.editingId = g.id;
    this.goalForm.patchValue({
      name: g.name,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteGoal(id: string) {
    if (confirm('Are you sure you want to delete this financial goal?')) {
      this.financeService.deleteGoal(id).catch(err => console.error(err));
    }
  }

  cancelEdit() {
    this.editingId = null;
    this.goalForm.reset({ savedAmount: 0 });
  }

  ngOnDestroy(): void {
    if (this.authSub) this.authSub.unsubscribe();
    if (this.dataSub) this.dataSub.unsubscribe();
  }
}