import React, {Component} from 'react';
import * as config from '../config/config.js';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LastViz from './LastViz.js'
import '../styles/layout/lightbox.scss';
import '../styles/pages/similarArtist.scss'

const last_similar_url = 'https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=';
const last_search_url = 'https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=';
const spot_search_url = 'https://api.spotify.com/v1/search?q=';
const spot_similar_url = 'https://api.spotify.com/v1/artists/'
const last_key = config.keys.last_api_key;
const spot_token = JSON.parse(localStorage.getItem('params'));

class SimilarArtists extends Component {
    constructor() {
        super();
        this.state = {
            artist: undefined,
            spotArtistObject: {},
            lastArtistObject: {},
            spotTopTracks: [],
            lastArtists: [],
            spotArtists: [],
            lastFinalArtists: [],
            spotFinalArtists: [],
            lightboxVisibility: false,
        }
    }

    async getLast(){
        const lastPromise = await axios.get(`${last_similar_url}${this.state.artist}&api_key=${last_key}&format=json`)
        console.log(lastPromise);
        return lastPromise;
    }

    getLastSearch = () => {
        const artistName = this.state.artist;
        console.log(this.state.artist);
        axios.get(`${last_search_url}${artistName}&api_key=${last_key}&format=json`)
        .then(({ data }) => {
            if(typeof data.artist !== "undefined") {
                this.setState({lastArtistObject: data.artist});
                console.log(data.artist)
            }
        })
    }

    getSpotSearch(){ //used for querying search artist and creating artist object
        const artistName = this.state.artist;
        if(spot_token === null) {
            setTimeout(() => { }, 100);
        }
        axios.get(`${spot_search_url}${artistName}&type=artist&limit=1`, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                Authorization: spot_token.token_type + " " + spot_token.access_token,
            }
        })
        .then(({ data }) => {
            if(typeof data.artists !== "undefined" && artistName !== "") {
                this.setState({spotArtistObject: data.artists.items[0]});
                console.log(data);
                this.getSpotTopTracks();
            }
        })
    }

    getSpotTopTracks = () => {
        if(spot_token === null) {
            setTimeout(() => { }, 100);
        }
        if(typeof this.state.spotArtistObject.id !== 'undefined') {
            const artistId = this.state.spotArtistObject.id;
            axios.get(`${spot_similar_url}${artistId}/top-tracks?market=US`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    Authorization: spot_token.token_type + " " + spot_token.access_token,
                }
            })
            .then(({ data }) => {
                if(typeof data.tracks !== "undefined" && artistId !== "") {
                    this.setState({spotTopTracks: data.tracks});
                    console.log(this.state.spotTopTracks);
                }
            })
        }
    }

    getSpotSimilar = () => {
        const tempLastArtistArray = []
        const tempSpotArtistArray = []
        const promises = []
        this.getLast().then(({data}) => {
            this.setState({lastArtists: data.similarartists.artist.slice()}, () => {
                var j = 0;
                if(this.state.lastArtists.length === 0 && typeof this.state.spotArtistObject !== 'undefined') { //if last.fm didn't return any similar artists
                    const artist_id = this.state.spotArtistObject.id;
                    promises.push(axios.get(`${spot_similar_url}${artist_id}/related-artists`, {
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            Authorization: spot_token.token_type + " " + spot_token.access_token,
                        }
                    }).then(({data}) => {
                        Promise.all(promises).then(() => { 
                            this.setState({spotArtists: data.artists})
                            console.log(data.artists);
                        });
                    }))
                }
                else if(this.state.lastArtists.length > 0) { //if last.fm returned any similar artists
                    for(var i = 0; i < this.state.lastArtists.length; i++) {
                        const similarQuery = this.state.lastArtists[i];
                        promises.push(axios.get(`${spot_search_url}${similarQuery.name}&type=artist&limit=1`, {
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                                Authorization: spot_token.token_type + " " + spot_token.access_token,
                            }
                        })
                        .then(({ data }) => {
                            const spotifySearchResult = data.artists.items[0]
                            if(typeof spotifySearchResult !== "undefined" && typeof data.artists !== "undefined" && this.state.artist !== undefined && similarQuery.name.toUpperCase() === spotifySearchResult.name.toUpperCase()) {
                                tempLastArtistArray.push(similarQuery);
                                tempSpotArtistArray.push(spotifySearchResult);
                            }
/*                             else
                            {
                                tempSpotArtistArray.push('null');
                                tempLastArtistArray.push('null');
                            } */
                            j++;
                        }).catch(err => {
                            return null;
                        }))
                    }
                    Promise.all(promises).then(() => {  //set the states once all the responses are complete
                        console.log(tempSpotArtistArray);
                        console.log(tempLastArtistArray);
                        console.log(promises);
                        this.setState({spotFinalArtists: tempSpotArtistArray})
                        this.setState({lastFinalArtists: tempLastArtistArray})
                    });
                }
            })
        })
    }

    componentDidMount(){
        this.setState({artist: this.props.artist}, () =>
        {
            this.getSpotSearch();
            this.getLastSearch();
            this.getSpotSimilar();
        });
    }

    componentDidUpdate (newProps) { //when a new artist is queried, execute the responses again
        if(this.props.artist != this.state.artist){
            this.setState({artist: this.props.artist}, () =>
            {
                this.setState({spotArtists: []})
                this.setState({lastArtists: []})
                this.getSpotSearch();
                this.getLastSearch();
                this.getSpotSimilar();
            })
        }
    }

    showLightbox = () => {
        if(this.state.lightboxVisibility == false){
            this.setState({lightboxVisibility: true});
        }else{
            this.setState({lightboxVisibility: false});
        }

        console.log(this.state.spotArtistObject);
    }

    async previewAudio(audio){
        var track = document.getElementById(audio); 
        var isPlaying = false;
        if(track !== null){
            track.volume= .1;
            if(track.paused == true){
                track.play();
            }
            else
            {
                track.pause();
            }
        }

    }
    
    render() {
        const images = [];
        const genres = [];
        const tracks = [];
        let lightbox;
        const sao = this.state.spotArtistObject;
        const lao = this.state.lastArtistObject;
        const toptracks = this.state.spotTopTracks;
        let lastViz;
        let sourceArtist;
        if(typeof sao !== "undefined" && typeof sao.images !== "undefined" && typeof lao !== "undefined" && typeof lao.bio !== "undefined") {
            sao.genres.map((i) => {
                genres.push(<li>{i}</li>)
            })
            if(typeof toptracks !== "undefined") {
                toptracks.map((g) => {
                    if(g.preview_url !== null){
                        tracks.push(
                            <div className="track">
                                <button className="preview-button"onClick={() => {this.previewAudio(g.name)}}></button>
                                <h3>{g.name}</h3>
                                <audio id={g.name}>
                                    <source src={g.preview_url} type="audio/mpeg"></source>
                                </audio>
                            </div>
                        )
                    }
                })
            }
            

            let last_link = <a id="last_link" href={lao.url}>Last.fm</a>
            let spot_link = <a href={sao.external_urls.spotify}>Spotify</a>
            sourceArtist = 
                <div key={sao.name}> 
                    <h1 id="artist-title" onClick={this.showLightbox} style={{ visibility: this.state.lightboxVisibility ? "hidden" : "visible", opacity: this.state.lightboxVisibility ? "0" : "1"}}>{sao.name}</h1>
                    <div className="lightbox" style={{ visibility: this.state.lightboxVisibility ? "visible" : "hidden", opacity: this.state.lightboxVisibility ? "1" : "0"}}>
                        <h1 className="lightbox-title" onClick={this.showLightbox}>{sao.name}</h1>
                        <div className="external-links">
                            {last_link}
                            {spot_link}
                        </div>
                        <div className="lightbox-container">
                            <div className="lightbox-image" style={{backgroundImage: `url(${sao.images[1].url})`}}></div>
                                <div className="artist_info">
                                <ul>    
                                    {tracks}                       
                                    <h2>Genre(s)</h2>
                                    {genres}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
        }
        if(this.state.spotFinalArtists.length !== 0 && this.state.lastFinalArtists.length !== 0) {    //if last.fm similar artists exist, render them.
            var lowest = 1;
            const last_results = this.state.lastFinalArtists
            const spot_results = this.state.spotFinalArtists
            for (var k = 0; k < this.state.lastArtists.length; k++) {
                    if(typeof last_results[k] !== 'undefined') {
                        if(last_results[k].match < lowest) {
                            lowest = last_results[k].match
                        }
                    }

                    //console.log(this.state.lastArtists);
                    //console.log(this.state.spotArtists);
                    if(typeof last_results[k] !== "undefined" && typeof spot_results[k] !== "undefined" && typeof spot_results[k].images !== "undefined" && spot_results[k] !== 'null') {
                        if(typeof spot_results[k].images[2] !== "undefined") {
                            const artist_name = last_results[k].name;
                            const artist_link = "/search/" + artist_name.replace(/\s/g, '+');
                        }
                    }                
            }
            console.log(lowest);
            lastViz = <LastViz lastResults={this.state.lastFinalArtists} lowest={lowest} spotResults={this.state.spotFinalArtists}></LastViz>
        }
        if(this.state.spotArtists.length !== 0 && this.state.lastArtists.length === 0){ //if last.fm similar artists don't exit, render spotify's similar artists.
            for(var l = 0; l < this.state.spotArtists.length; l++) {
                const spot_results = this.state.spotArtists;
                const artist_name = spot_results[l].name;
                const artist_link = "/search/" + artist_name.replace(/\s/g, '+');
            }
        }


        return (
            <div>
                {lightbox}
                {sourceArtist}
                {lastViz}
                {images}
            </div>
        );
    }
};
export default SimilarArtists;