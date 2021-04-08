//Author: Kendall Tencio Esquivel
//Description: This component manages the aspects of collecting and passing some basic data.

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable, of} from 'rxjs';
import { DataModel, DataModelLoc, DataModelTests } from 'src/app/data/data.model';
import covid_tests_data from '../assets/covid_tests.json';
import { enableProdMode } from '@angular/core';
import { environment } from '../environments/environment';

if (environment.production) {
    enableProdMode();
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit{
  data: Observable<DataModel>;
  data_protein_segments: Observable<DataModelLoc>;
  data_gene_segments: Observable<DataModelLoc>;
  covid_tests_array: DataModelTests[] = covid_tests_data;
  covid_tests_array_names: Observable<string[]>;
  covid_tests_array_segm: Observable<string[]>
  covid_tests_array_names_aux: string[] = [];
  covid_tests_array_segm_aux: string[] = [];

  ngOnInit(){ this.generateArrayCovidTests(); }

  generateArrayCovidTests(){
    this.covid_tests_array.forEach(element => { this.covid_tests_array_names_aux.push(element.test_name); this.covid_tests_array_segm_aux.push(element.gene_targets); });
    this.covid_tests_array_names =  of(this.covid_tests_array_names_aux);
    this.covid_tests_array_segm =  of(this.covid_tests_array_segm_aux);
  }

  constructor(private http: HttpClient) {
    this.data = this.http.get<DataModel>('assets/data_values.json');
    this.data_gene_segments = this.http.get<DataModelLoc>('assets/gene_locations.json');
    this.data_protein_segments = this.http.get<DataModelLoc>('assets/protein_locations.json');
  }
}