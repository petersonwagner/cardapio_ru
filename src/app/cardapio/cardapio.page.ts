import { Component } from '@angular/core';
import { parse } from 'node-html-parser';
import { HttpClient } from '@angular/common/http'; 
import { HttpHeaders } from '@angular/common/http';
import { ViewChild , ElementRef} from '@angular/core'
import { IonContent } from '@ionic/angular'
import { Storage } from '@ionic/storage';
import { AlertController } from '@ionic/angular';
import { HTTP } from '@ionic-native/http/ngx';

@Component({
  selector: 'app-cardapio',
  templateUrl: './cardapio.page.html',
  styleUrls: ['./cardapio.page.scss'],
})
export class CardapioPage {
	@ViewChild("breakfast_card", { read: ElementRef, static: true }) breakfast_card: any;
	@ViewChild("lunch_card", { read: ElementRef, static: true }) lunch_card: any;
	@ViewChild("dinner_card", { read: ElementRef, static: true }) dinner_card: any;
	@ViewChild(IonContent, {static: false}) content: any;

	menus_available: any = [];
	current_menu: any = {};

	current_ru: string = "politecnico";
	
	//obrigado cors, vou lidar com isso depois
	ru_url: any = {
		"reitoria": "https://cors-anywhere.herokuapp.com/" + "http://www.pra.ufpr.br/portal/ru/ru-central/",
		"politecnico": "https://cors-anywhere.herokuapp.com/" + "http://www.pra.ufpr.br/portal/ru/ru-centro-politecnico/",
		"botanico": "https://cors-anywhere.herokuapp.com/" + "http://www.pra.ufpr.br/portal/ru/cardapio-ru-jardim-botanico/",
		"agrarias": "https://cors-anywhere.herokuapp.com/" + "http://www.pra.ufpr.br/portal/ru/cardapio/cardapio-ru-agrarias/",
	}

  constructor(
		public httpClient: HttpClient,
		public nativehttp: HTTP,
		private storage: Storage,
    public alertController: AlertController,
	) {  }

  choose_day(event){
  	let current_day = event.detail.value;

  	for (var i = 0; i < this.menus_available.length; i++) {
  		let element = this.menus_available[i];

  		if (element.day_value == current_day){
  			this.current_menu = this.copy_object(element);
  			return;
  		}
  	}
  }

  copy_object(obj){
  	return JSON.parse(JSON.stringify(obj));
  }

  async choose_ru(event){
  	this.current_ru = event.detail.value;
  	await this.storage.set('current_ru', event.detail.value);
  	this.refresh_page();
  }

  ngOnInit(){
    this.refresh_page();
  }

  async pull_refresh_page(event){
  	this.menus_available = [];
  	this.current_menu = {};
  	setTimeout(() => {
  		this.reload_page();
  		event.target.complete();
  	}, 1000);
  }

  async refresh_page(){
  	this.menus_available = [];
  	this.current_menu = {};
  	setTimeout(() => {
  		this.reload_page();
  	}, 1000);
  }

  async reload_page(){
  	let last_ru_option = await this.storage.get('current_ru');
  	if (last_ru_option){
  		this.current_ru = last_ru_option;
	  }
	  
	
	  let options: any = {
		  headers: new HttpHeaders({ 
			'Accept': 'text/html', 
		  }),
		  responseType: "text"
	  }

    this.httpClient.get(
      this.ru_url[this.current_ru], options)
    .subscribe((html_data: any) => {
    	this.menus_available = [];

      let root:any = parse(html_data)
      let query_result: any = root.querySelector('#post').childNodes[5].childNodes;
      query_result = this.clear_text_nodes(query_result);

  		let new_menu: any = {};
      for (var i = 0; i < query_result.length; i++) {
      	let element = query_result[i];

      	//é marcador de dia?
      	if (element.innerHTML.includes("<strong>")){
    			//se tinha algum new_menu anteriormente, coloca em menus_available
    			if (!this.is_empty(new_menu)){
    				this.menus_available.push(new_menu);
    			}

    			new_menu = {};
      		new_menu.day_value = element.text;
      		new_menu.day_text = element.text.split(" ")[1];
      	}

      	//é cafe da manha?
      	if (element.innerHTML.includes("CAFÉ DA MANHÃ")){
      		new_menu.breakfast = this.get_menu(element.childNodes);
      	}

      	//é almoço?
      	if (element.innerHTML.includes("ALMOÇO")){
      		new_menu.lunch = this.get_menu(element.childNodes);
      	}

      	//é janta?
      	if (element.innerHTML.includes("JANTAR")){
      		new_menu.dinner = this.get_menu(element.childNodes);
      	}

      }

    	//adiciona o ultimo dia
			this.menus_available.push(new_menu);

      this.set_current_menu();
    },
    async error => {
      const alert = await this.alertController.create({
        header: 'Erro',
        message: JSON.stringify(error),
        buttons: ['OK']
      });

      await alert.present();
    });
  }

  set_current_menu(){
  	var date = new Date();
  	var current_date = date.getDate().toString().padStart(2, "0") + "/" + (date.getMonth()+1).toString().padStart(2, "0");

  	for (var i = 0; i < this.menus_available.length; i++) {
  		let element = this.menus_available[i];

  		if (element.day_value.includes(current_date)){
				this.current_menu = this.copy_object(element);
				break;
  		}

  		if (element.day_value.split("/")[0] > current_date){
				this.current_menu = this.copy_object(element);
				break;
  		}
  	}

  	if (this.is_empty(this.current_menu)){
			this.current_menu = this.copy_object(this.menus_available[0]);
  	}

  	//this.scroll_current_card();
  }

  scroll_current_card(){
  	var date = new Date();
  	var current_time = date.toLocaleTimeString();

    this.content.scrollToPoint(0, this.dinner_card.nativeElement.offsetTop, 1000);
  }

  is_empty(obj){
  	return Object.keys(obj).length === 0;
  }

  get_menu(html_nodes){
  	html_nodes = this.clear_irrelevant_nodes(html_nodes);

  	var menu = [];
  	let current_menu_item: any = {};
  	for (var i = 0; i < html_nodes.length; i++) {
  		let element = html_nodes[i];

  		if  (element.nodeType == 3){

  			if (!this.is_empty(current_menu_item)){
  				menu.push(current_menu_item);
  			}

				current_menu_item = {}
  			current_menu_item.text = element.rawText;
  		}
  		else {
  			if (element.innerHTML.includes("vegano")){
  				current_menu_item.no_vegan = true;
  			}

  			if (element.innerHTML.includes("gluten")){
  				current_menu_item.no_celiac = true;	
  			}

  			if (element.innerHTML.includes("lactose")){
  				current_menu_item.no_lactose_intolerant = true;
  			}
  		}
  	}

  	//adiciona o ultimo item
  	menu.push(current_menu_item);

  	return menu;
  }


  clear_irrelevant_nodes(html_nodes){
  	let filtered_array = html_nodes.filter(function(value, index, arr){
    	return (value.tagName == "a" || (value.nodeType == 3 && !value.isWhitespace));
		});

		return filtered_array;
  }

  clear_text_nodes(html_nodes){
  	let filtered_array = html_nodes.filter(function(value, index, arr){
    	return value.nodeType != 3;
		});

		return filtered_array;
  }

}
