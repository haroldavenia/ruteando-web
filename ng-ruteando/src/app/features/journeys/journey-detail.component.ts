import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { JourneysApi } from '../../core/api/data/journeys.api';
import { PlannedJourney } from '../../core/api/models';
import { RecordLoader } from '../../shared/data/record-loader';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { formatCount, formatDateTime, formatDuration } from '../../shared/format';

import { JourneyRoutesComponent } from './journey-routes.component';
import { journeyStatusLabel } from './journey-labels';

@Component({
  selector: 'app-journey-detail',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, FormResultComponent, JourneyRoutesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journey-detail.component.html',
  styleUrl: './journey-detail.component.scss',
})
export class JourneyDetailComponent {
  private readonly api = inject(JourneysApi);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') as string;

  protected readonly loader = new RecordLoader<PlannedJourney>(this.id, (id) => this.api.get(id));

  protected readonly status = journeyStatusLabel;
  protected readonly duration = formatDuration;
  protected readonly count = formatCount;
  protected readonly dateTime = formatDateTime;

  constructor() {
    this.loader.load(() => undefined);
  }
}
